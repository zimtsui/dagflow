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
            const draft = gencache.lazy();
            super(draft.signal, draft.extract());
        }

        /**
         * @throws {@link Draft.AbortError}
         */
        public async next(rejection: Rejection<rejection>): Promise<IteratorYieldResult<Opposition<opposition>>> {
            this.signal.throwIfAborted();
            const output = await this.gencache.next(rejection);
            if (output instanceof Opposition.Instance) return { done: false, value: output };
            this.signal.throwIfAborted();
            throw new Error();
        }
    }

    export function create<draft, rejection, opposition>(
        gencache: Generator.Cache<draft, rejection, opposition>,
    ): Debate<draft, rejection, opposition> {
        return new Debate.Instance(gencache);
    }
}
