import { Generator } from './generator.ts';
import { Debate } from './debate.ts';
import { Draft, Opposition } from './types.ts';



export class Node<
    out draft, in rejection, out opposition,
> implements AsyncIterableIterator<Debate<draft, rejection, opposition>, never, void>, AsyncDisposable {
    /**
     * @param gencache Ownership transferred.
     */
    protected constructor(
        protected gencache: Generator.Cache<draft, rejection, opposition>,
    ) {}

    public async next(): Promise<IteratorYieldResult<Debate<draft, rejection, opposition>>> {
        const debate = Debate.create(this.gencache);
        return { value: debate, done: false };
    }

    public async [Symbol.asyncDispose](): Promise<void> {
        await this.gencache[Symbol.asyncDispose]?.();
    }

    public static async from<draft, rejection, opposition>(
        generator: Generator<draft, rejection, opposition>,
    ): Promise<Node<draft, rejection, opposition>> {
        const gencache = await Generator.Cache.from(generator);
        return new Node(gencache);
    }

    public [Symbol.asyncIterator](): this {
        return this;
    }

    public async map<nextdraft>(
        f: (draft: draft) => PromiseLike<nextdraft>,
        after: Node<unknown, never, unknown>,
    ): Promise<Node<nextdraft, rejection, opposition>> {
        return await Node.from(this.mapgen(f, after));
    }

    protected async *mapgen<nextdraft>(
        f: (draft: draft) => PromiseLike<nextdraft>,
        after: Node<unknown, never, unknown>,
    ): Generator<nextdraft, rejection, opposition> {
        for (;;) try {
            const thisDebate = await this.next().then(r => r.value);
            const afterDebate = await after.next().then(r => r.value);
            const signal = AbortSignal.any([thisDebate.signal, afterDebate.signal]);
            signal.throwIfAborted();
            let output: Draft<nextdraft> | Opposition<opposition> = Draft.from(signal, await f(thisDebate.extract()));
            for (;;) output = await thisDebate.next(yield output).then(r => r.value);
        } catch (e) {
            if (e instanceof Draft.AbortError) {} else throw e;
        }
    }

    public static async all(nodes: Node<unknown, never, unknown>[]): Promise<Node<void, never, never>> {
        return await Node.from(Node.allgen(nodes));
    }

    protected static async *allgen(nodes: Node<unknown, never, unknown>[]): Generator<void, never, never> {
        for (;;) try {
            const debates = await Promise.all(nodes.map(node => node.next().then(r => r.value)));
            const signal = AbortSignal.any(debates.map(debate => debate.signal));
            signal.throwIfAborted();
            yield Draft.from(signal);
            throw new Error();
        } catch (e) {
            if (e instanceof Draft.AbortError) {} else throw e;
        }
    }

    public static async empty(): Promise<Node<void, never, never>> {
        return await Node.from(Node.emptygen());
    }

    protected static async *emptygen(): Generator<void, never, never> {
        for (;;) try {
            yield Draft.from(new AbortSignal());
        } catch (e) {
            if (e instanceof Draft.AbortError) {} else throw e;
        }
    }
}
