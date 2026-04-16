import { Mutex } from '@zimtsui/typelocks';
import { Draft, Rejection, Opposition } from './types.ts';


export interface Generator<
    draft, rejection, opposition,
> extends
    AsyncIterator<Draft<draft> | Opposition<opposition>, never, void | Rejection<rejection>>,
    AsyncDisposable
{
    next(feedback: void | Rejection<rejection>): Promise<IteratorYieldResult<Draft<draft> | Opposition<opposition>>>;
}

export namespace Generator {
    export class Cache<
        draft, rejection, opposition,
    > implements
        Generator<draft, rejection, opposition>
    {
        /**
         * @param raw Ownership transferred.
         */
        protected constructor(
            protected draft: Draft<draft>,
            protected ac: AbortController,
            protected raw: Generator<draft, rejection, opposition>,
        ) {}

        public async next(feedback: void | Rejection<rejection>): Promise<IteratorYieldResult<Draft<draft> | Opposition<opposition>>> {
            await this.mutex.acquire();
            try {
                const output = await this.raw.next(feedback).then(r => r.value);
                if (output instanceof Opposition.Instance) return { value: output, done: false };
                this.ac.abort();
                this.ac = new AbortController();
                this.draft = Draft.from(this.ac.signal, output.extract());
                return { value: this.draft, done: false };
            } finally {
                this.mutex.release();
            }
        }

        public lazy(): Draft<draft> {
            return this.draft;
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.mutex.acquire();
            try {
                return await this.raw[Symbol.asyncDispose]?.();
            } finally {
                this.mutex.release();
            }
        }

        /**
         * @param raw Ownership transferred.
         */
        public static async from<draft, rejection, opposition>(
            raw: Generator<draft, rejection, opposition>,
        ): Promise<Generator.Cache<draft, rejection, opposition>> {
            const output = await raw.next().then(r => r.value);
            if (output instanceof Draft.Instance) {} else throw new Error();
            const ac = new AbortController();
            const draft = Draft.from(ac.signal, output.extract());
            return new Generator.Cache(draft, ac, raw);
        }

        protected mutex = Mutex.release();
    }
}
