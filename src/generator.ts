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
            output: Draft<draft> | Opposition<opposition>,
            protected raw: Generator<draft, rejection, opposition>,
        ) {
            if (output instanceof Draft.Instance) {} else throw new Error();
            this.draft = Draft.from([output.signal, this.ac.signal], output.extract());
        }

        protected mutex = Mutex.release();
        protected ac = new AbortController();
        protected draft: Draft<draft>;

        public async next(rejection: Rejection<rejection>): Promise<IteratorYieldResult<Draft<draft> | Opposition<opposition>>> {
            await this.mutex.acquire();
            try {
                if (this.ac) {} else throw new Error();
                const output = await this.raw.next(rejection).then(r => r.value);
                if (output instanceof Opposition.Instance) return { value: output, done: false };
                this.ac.abort(new Draft.AbortError());
                this.ac = new AbortController();
                this.draft = Draft.from(
                    [this.ac.signal, output.signal],
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
                this.ac.abort(e);
                const output = await this.raw.throw(e).then(r => r.value);
                this.ac = new AbortController();
                if (output instanceof Draft.Instance) {} else throw new Error();
                this.draft = Draft.from(
                    [this.ac.signal, output.signal],
                    output.extract(),
                );
                return { value: this.draft, done: false };
            } finally {
                this.mutex.release();
            }
        }

        public current(): Draft<draft> {
            return this.draft;
        }

        public [Symbol.asyncIterator](): this {
            return this;
        }

        public async [Symbol.asyncDispose](): Promise<void> {
            await this.mutex.acquire();
            try {
                this.ac?.abort(new Draft.AbortError());
                return await this.raw[Symbol.asyncDispose]?.();
            } finally {
                this.mutex.release();
            }
        }

        /**
         * @param raw Ownership transferred.
         */
        public static async from<output, rejection, opposition>(
            raw: Generator<output, rejection, opposition>,
        ): Promise<Generator.Cache<output, rejection, opposition>> {
            const output = await raw.next().then(r => r.value);
            return new Generator.Cache(output, raw);
        }

    }
}
