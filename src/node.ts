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
                    if (draft.getTimestamp() > this.draft.getTimestamp()) throw new CacheMiss();
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
            return new Mapped(this, f);
        }
    }

    export class Mapped<draft, nextdraft, rejection, opposition> implements Node<nextdraft, rejection, opposition> {
        public constructor(
            protected node: Node<draft, rejection, opposition>,
            protected f: (draft: draft) => Promise<nextdraft>,
        ) {}
        protected draft: Draft.Stamped<nextdraft> | null = null;
        public async repeat(): Promise<Draft.Stamped<nextdraft>> {
            try {
                if (this.draft) {} else throw new CacheMiss();
                const draft = await this.node.repeat();
                if (draft.getTimestamp() > this.draft.getTimestamp()) throw new CacheMiss();
                return this.draft;
            } catch (e) {
                const draft = await this.node.repeat();
                return this.draft = Draft.Stamped.create(timestamp++, await this.f(draft.extract()));
            }


        }
        public async reject(rejection: Rejection<rejection>): Promise<Draft.Stamped<nextdraft> | Opposition<opposition>> {
            const output = await this.node.reject(rejection);
            if (output instanceof Opposition.Instance) return output;
            return Draft.Stamped.create(timestamp++, await this.f(output.extract()));
        }
        public map<nextnextdraft>(
            f: (draft: nextdraft) => Promise<nextnextdraft>,
        ): Node<nextnextdraft, rejection, opposition> {
            return new Mapped(this, f);
        }
        public async [Symbol.asyncDispose](): Promise<void> {}
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
