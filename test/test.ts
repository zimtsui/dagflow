import test from 'ava';
import { Debate, Draft, Generator, Node, Opposition, Rejection } from '../build/exports.js';


async function *counter(start = 1): AsyncGenerator<Draft<number>, never, Rejection<string>> {
    let current = start;
    for (;;) {
        const rejection = yield Draft.from([], current);
        if (rejection instanceof Rejection.Instance) current += 1;
    }
}

async function *opposer(): AsyncGenerator<Draft<number> | Opposition<string>, never, Rejection<string>> {
    const firstRejection = yield Draft.from([], 1);
    if (!(firstRejection instanceof Rejection.Instance)) throw new Error();
    const secondRejection = yield Opposition.from(`reject:${firstRejection.extract()}`);
    if (!(secondRejection instanceof Rejection.Instance)) throw new Error();
    yield Draft.from([], 2);
    throw new Error();
}

test('generator cache exposes the initial draft and refreshes current draft after next', async t => {
    await using cache = await Generator.Cache.from(counter());

    t.is(cache.current().extract(), 1);

    const nextDraft = await cache.next(Rejection.from('update')).then(r => r.value);
    t.true(nextDraft instanceof Draft.Instance);
    if (!(nextDraft instanceof Draft.Instance)) return;

    t.is(nextDraft.extract(), 2);
    t.is(cache.current().extract(), 2);
    t.true(cache.current().signal === nextDraft.signal);
});

test('generator cache throw refreshes the current draft', async t => {
    async function *abortable(): AsyncGenerator<Draft<number>, never, Rejection<string>> {
        try {
            yield Draft.from([], 1);
            throw new Error();
        } catch (e) {
            if (e instanceof Draft.AbortError) {
                yield Draft.from([], 2);
                throw new Error();
            }
            throw e;
        }
    }

    await using cache = await Generator.Cache.from(abortable());
    const refreshed = await cache.throw(new Draft.AbortError()).then(r => r.value);

    t.is(refreshed.extract(), 2);
    t.is(cache.current().extract(), 2);
});

test('debate returns opposition and then expires after the cache advances', async t => {
    await using cache = await Generator.Cache.from(opposer());
    const debate = Debate.capture(cache);

    const opposition = await debate.next(Rejection.from('bad draft')).then(r => r.value);
    t.true(opposition instanceof Opposition.Instance);
    t.is(opposition.extract(), 'reject:bad draft');

    const nextDraft = await cache.next(Rejection.from('retry')).then(r => r.value);
    t.true(nextDraft instanceof Draft.Instance);
    if (!(nextDraft instanceof Draft.Instance)) return;
    t.is(nextDraft.extract(), 2);

    await t.throwsAsync(
        () => debate.next(Rejection.from('again')),
        { instanceOf: Draft.AbortError },
    );
});

test('node.next captures the latest draft after another debate advances the cache', async t => {
    await using node = await Node.from(counter());

    const debate1 = await node.next().then(r => r.value);
    t.is(debate1.extract(), 1);

    await t.throwsAsync(
        () => debate1.next(Rejection.from('update')),
        { instanceOf: Draft.AbortError },
    );

    const debate2 = await node.next().then(r => r.value);
    t.is(debate2.extract(), 2);
    t.false(debate2.signal.aborted);
});

test('node.map refreshes when the source node publishes a new draft', async t => {
    await using source = await Node.from(counter());
    await using after = await Node.empty();
    await using mapped = await source.map(async draft => draft * 10, after);

    const mapped1 = await mapped.next().then(r => r.value);
    t.is(mapped1.extract(), 10);

    const sourceDebate = await source.next().then(r => r.value);
    await t.throwsAsync(
        () => sourceDebate.next(Rejection.from('update')),
        { instanceOf: Draft.AbortError },
    );

    const mapped2 = await mapped.next().then(r => r.value);
    t.is(mapped2.extract(), 20);
    t.false(mapped2.signal.aborted);
});

test('node.all refreshes when any dependency publishes a new draft', async t => {
    await using left = await Node.from(counter());
    await using right = await Node.from(counter(100));
    await using joined = await Node.all([left, right]);

    const joined1 = await joined.next().then(r => r.value);
    t.false(joined1.signal.aborted);

    const leftDebate = await left.next().then(r => r.value);
    await t.throwsAsync(
        () => leftDebate.next(Rejection.from('update')),
        { instanceOf: Draft.AbortError },
    );

    const joined2 = await joined.next().then(r => r.value);
    t.false(joined2.signal.aborted);
});
