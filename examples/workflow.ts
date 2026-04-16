import { Node } from '@zimtsui/dagflow';
declare function optimize(problem: string): Generator<string, string, string>;
declare function evaluate1(problem: string): Generator<void, never, never>;
declare function evaluate2(problem: string): Generator<boolean, never, never>;


export async function workflow(problem: string): Promise<boolean> {
    const optimizerDnm = {} satisfies Node.DepNodeMap.Proto;
    const optimizerGen = optimize(problem);
    await using optimizer = Node.create(optimizerGen, optimizerDnm);

    const evaluate1Dnm: evaluate1.DepNodeMap = { optimizer };
    const evaluate1Gen = evaluate1(problem, evaluate1Dnm);
    await using evaluator1 = Node.create(evaluate1Gen, evaluate1Dnm);

    const evaluate2Dnm: evaluate2.DepNodeMap = {
        optimizer: optimizer.map(async s => Number.parseInt(s)),
        evaluator1,
    };
    const evaluate2Gen = evaluate2(problem, evaluate2Dnm);
    await using evaluator2 = Node.create(evaluate2Gen, evaluate2Dnm);

    const draft = await evaluator2.repeat();
    return draft.extract();
};
