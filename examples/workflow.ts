import { Node, Generator } from '@zimtsui/dagflow';
declare function optimize(problem: string): Generator<string, string, string>;
declare function evaluate1(problem: string, optimizer: Node<string, string, string>): Generator<void, never, never>;
declare function evaluate2(problem: string, optimizer: Node<number, string, string>): Generator<boolean, never, never>;


export async function workflow(problem: string): Promise<boolean> {
    await using optimizer = await Node.from(optimize(problem));
    await using evaluator1 = await Node.from(evaluate1(problem, optimizer));
    await using numberView = await optimizer.map(
        async s => Number.parseInt(s),
        evaluator1,
    );
    await using evaluator2 = await Node.from(evaluate2(problem, numberView));
    const debate = await evaluator2.next().then(r => r.value);
    return debate.extract();
};
