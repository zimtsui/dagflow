import { Draft, Rejection, Opposition, Node } from '@zimtsui/dagflow';
import OpenAI from 'openai';
declare const openai: OpenAI;


export async function *evaluate(problem: string, dnm: Evaluate.DepNodeMap): Node.Generator<number, never, never> {
    const optimizer = dnm.optimizer;
    let draft = await optimizer.repeat();
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answers of the given math problems.',
                'Print only `ACCEPT` if it is correct. Print reason if it is incorrect.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${draft.extract()}` },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        if (completion.choices[0]!.message.content === 'ACCEPT') {
            yield Draft.from(Number.parseInt(draft.extract()));
            const nextdraft = await optimizer.repeat();
            messages.push({ role: 'user', content: `Problem: ${problem}\n\nAnswer: ${nextdraft.extract()}` });
        } else {
            const input = await optimizer.reject(Rejection.from(completion.choices[0]!.message.content!));
            if (input instanceof Draft.Instance) {
                draft = input;
                messages.push({
                    role: 'user',
                    content: `The answer is updated: ${draft.extract()}\n\nPlease examine it again.`,
                });
            } else if (input instanceof Opposition.Instance) {
                const opposition = input;
                messages.push({
                    role: 'user',
                    content: `Your rejection is opposed: ${opposition.extract()}\n\nPlease examine it again.`,
                });
            } else throw new Error();
        }
    }
}

export namespace Evaluate {
    export type DepNodeMap = {
        optimizer: Node<string, string, string>,
    };
}
