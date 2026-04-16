import { Rejection, Opposition, Draft } from './types.ts';
import { Generator } from './generator.ts';


export type Debate<draft, rejection, opposition> = Debate.Instance<draft, rejection, opposition>;
export namespace Debate {

    export class Instance<
        out draft, in rejection, out opposition,
    > extends Draft.Instance<draft> implements
        AsyncIterator<Opposition<opposition>, never, Rejection<rejection>>
    {
        public constructor(
            protected gencache: Generator.Cache<draft, rejection, opposition>,
        ) {
            const draft = gencache.current();
            super(draft.signal, draft.extract());
        }

        /**
         * @throws {@link Draft.AbortError}
         */
        public async next(rejection: Rejection<rejection>): Promise<IteratorYieldResult<Opposition<opposition>>> {
            await this.gencache.mutex.acquire();
            try {
                this.signal.throwIfAborted();
                const output = await this.gencache.next(rejection);
                if (output instanceof Opposition.Instance) return { done: false, value: output };
                this.signal.throwIfAborted();
                throw new Error();
            } finally {
                this.gencache.mutex.release();
            }
        }
    }

    export function capture<draft, rejection, opposition>(
        gencache: Generator.Cache<draft, rejection, opposition>,
    ): Debate<draft, rejection, opposition> {
        return new Debate.Instance(gencache);
    }
}
