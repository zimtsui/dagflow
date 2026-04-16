import { Mutex } from '@zimtsui/typelocks';
import { Draft, Rejection, Opposition } from './types.ts';


export interface Generator<
    draft, rejection, opposition,
> extends
    AsyncIterableIterator<Draft<draft> | Opposition<opposition>, never, Rejection<rejection>>,
    AsyncDisposable
{
    next(...[rejection]: [] | [Rejection<rejection>]): Promise<IteratorResult<Draft<draft> | Opposition<opposition>, never>>;
    throw(e: Draft.AbortError): Promise<IteratorResult<Draft<draft> | Opposition<opposition>, never>>;
}

export namespace Generator {
    export class Cache<
        draft, rejection, opposition,
    > implements
        AsyncIterator<Draft<draft> | Opposition<opposition>, never, Rejection<rejection>>,
        AsyncDisposable
    {
        /**
         * @param raw Ownership transferred.
         */
        protected constructor(
            protected draft: Draft<draft>,
            protected ac: AbortController,
            protected raw: Generator<draft, rejection, opposition>,
        ) {}

        protected mutex = Mutex.release();

        public async next(rejection: Rejection<rejection>): Promise<IteratorYieldResult<Draft<draft> | Opposition<opposition>>> {
            await this.mutex.acquire();
            try {
                const output = await this.raw.next(rejection).then(r => r.value);
                if (output instanceof Opposition.Instance) return { value: output, done: false };
                this.ac.abort(new Draft.AbortError());
                this.ac = new AbortController();
                this.draft = Draft.from(
                    AbortSignal.any([this.ac.signal, output.signal]),
                    output.extract(),
                );
                return { value: this.draft, done: false };
            } finally {
                this.mutex.release();
            }
        }

        public async throw(e: Draft.AbortError): Promise<IteratorYieldResult<Draft<draft>>> {
            await this.mutex.acquire();
            try {
                const output = await this.raw.throw(e).then(r => r.value);
                if (output instanceof Draft.Instance) {} else throw new Error();
                this.ac.abort(e);
                this.ac = new AbortController();
                this.draft = Draft.from(
                    AbortSignal.any([this.ac.signal, this.draft.signal]),
                    output.extract(),
                );
                return { value: this.draft, done: false };
            } finally {
                this.mutex.release();
            }
        }

        public [Symbol.asyncIterator](): this {
            return this;
        }

        public lazy(): Draft<draft> {
            return this.draft;
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.mutex.acquire();
            try {
                this.ac.abort(new Draft.AbortError());
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

    }
}
