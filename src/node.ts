import { Rejection, Opposition, Draft } from './types.ts';


class CacheMiss {}
let timestamp = 0;


export interface Node<
    out draft, in rejection, out opposition,
> extends AsyncDisposable {
    repeat(): Promise<Draft.Stamped<draft>>;
    reject(rejection: Rejection<rejection>): Promise<Draft.Stamped<draft> | Opposition<opposition>>;
    map<nextdraft>(f: (draft: draft) => Promise<nextdraft>): Node<nextdraft, rejection, opposition>;
}

export namespace Node {
    /**
     * @param generator Ownership transferred.
     */
    export function create<draft, rejection, opposition, dnm extends Node.DepNodeMap.Proto>(
        generator: Node.Generator<draft, rejection, opposition>,
        dnm: dnm,
    ): Node<draft, rejection, opposition> {
        return new Instance(generator, dnm);
    }

    export class Instance<
        out draft, in rejection, out opposition, dnm extends Node.DepNodeMap.Proto,
    > implements Node<draft, rejection, opposition>, AsyncDisposable {
        /**
        * @param generator Ownership transferred.
        */
        public constructor(
            protected generator: Node.Generator<draft, rejection, opposition>,
            protected dnm: dnm,
        ) {}
        protected draft: Draft.Stamped<draft> | null = null;

        public async repeat(): Promise<Draft.Stamped<draft>> {
            try {
                if (this.draft) {} else throw new CacheMiss();
                for (const name of Object.keys(this.dnm) as (keyof dnm)[]) {
                    const node = this.dnm[name]!;
                    const draft = await node.repeat();
                    if (draft.getTimestamp() > this.draft.getTimestamp()) {} else throw new CacheMiss();
                }
                return this.draft;
            } catch (e) {
                const output = await this.generator.next().then(r => r.value);
                if (output instanceof Draft.Instance) {} else throw new Error();
                return this.draft = Draft.Stamped.create(timestamp++, output.extract());
            }
        }

        public async reject(rejection: Rejection<rejection>): Promise<Draft.Stamped<draft> | Opposition<opposition>> {
            if (this.draft) {} else throw new Error();
            const output = await this.generator.next(rejection).then(r => r.value);
            if (output instanceof Opposition.Instance) return output;
            return this.draft = Draft.Stamped.create(timestamp++, output.extract());
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            return await this.generator[Symbol.asyncDispose]?.();
        }

        public map<nextdraft>(
            f: (draft: draft) => Promise<nextdraft>,
        ): Node<nextdraft, rejection, opposition> {
            const dnm = {
                incoming: this,
            } as const satisfies Node.DepNodeMap.Proto;
            return new Node.Instance<nextdraft, rejection, opposition, typeof dnm>(this.mapgenerate(f), dnm);
        }

        protected async *mapgenerate<nextdraft>(
            f: (draft: draft) => Promise<nextdraft>,
        ): Node.Generator<nextdraft, rejection, opposition> {
            const draft = await this.repeat();
            const nextdraft = await f(draft.extract());
            let output: Draft<nextdraft> | Opposition<opposition> = Draft.from(nextdraft);
            for (;;) {
                const feedback: void | Rejection<rejection> = yield output;
                const input: Draft<draft> | Opposition<opposition> = feedback instanceof Rejection.Instance
                    ? await this.reject(feedback)
                    : await this.repeat();
                if (input instanceof Draft.Instance) {
                    const draft = input;
                    const nextdraft = await f(draft.extract());
                    output = Draft.from(nextdraft);
                } else if (input instanceof Opposition.Instance) {
                    output = input;
                } else throw new Error();
            }
        }
    }

    export type Proto = Node<unknown, never, unknown>;

    export type Generator<
        draft, rejection, opposition,
    > = AsyncGenerator<Draft<draft> | Opposition<opposition>, never, void | Rejection<rejection>>;

    export interface Generate<
        in out draft, in out rejection, in out opposition, dnm extends Node.DepNodeMap.Proto,
    > {
        (dnm: dnm): Node.Generator<draft, rejection, opposition>;
    }

    export namespace DepNodeMap {
        export type Proto = Record<string, Node.Proto>;
    }

}
