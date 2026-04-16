import { Generator } from './generator.ts';
import { Debate } from './debate.ts';



export class Node<
    out draft, in rejection, out opposition,
> implements AsyncIterator<Debate<draft, rejection, opposition>, never, void>, AsyncDisposable {
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
}
