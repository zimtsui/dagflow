const NOMINAL = Symbol();



export type Draft<draft> = Draft.Instance<draft>;
export namespace Draft {
    export class Instance<out draft> {
        protected declare [NOMINAL]: never;
        public constructor(public signal: AbortSignal, protected raw: draft) {}
        public [Symbol.toPrimitive](): never {
            throw new Error();
        }
        public extract(): draft {
            return this.raw;
        }
    }
    export function from<draft>(signal: AbortSignal, raw: draft): Draft<draft>;
    export function from(signal: AbortSignal): Draft<void>;
    export function from<draft>(signal: AbortSignal, raw?: draft): Draft<draft> {
        return new Draft.Instance<draft>(signal, raw as draft);
    }

    export class AbortError extends Error {}
}


export type Rejection<rejection> = Rejection.Instance<rejection>;
export namespace Rejection {
    export class Instance<out rejection> extends Error {
        protected declare [NOMINAL]: never;
        public constructor(public override cause: rejection) {
            super();
        }
        public [Symbol.toPrimitive](): never {
            throw new Error();
        }
        public extract(): rejection {
            return this.cause;
        }
    }
    export function from<rejection>(rejection: rejection): Rejection<rejection>;
    export function from(): Rejection<void>;
    export function from<rejection>(rejection?: rejection): Rejection<rejection> {
        return new Rejection.Instance(rejection as rejection);
    }
}


export type Opposition<opposition> = Opposition.Instance<opposition>;
export namespace Opposition {
    export class Instance<out opposition> extends Error {
        protected declare [NOMINAL]: never;
        public constructor(public override cause: opposition) {
            super();
        }
        public [Symbol.toPrimitive](): never {
            throw new Error();
        }
        public extract(): opposition {
            return this.cause;
        }
    }
    export function from<opposition>(value: opposition): Opposition<opposition>;
    export function from(): Opposition<void>;
    export function from<opposition>(value?: opposition): Opposition<opposition> {
        return new Opposition.Instance(value as opposition);
    }
}
