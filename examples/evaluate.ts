import { Draft, Rejection, Node, Generator } from '@zimtsui/dagflow';
import OpenAI from 'openai';
declare const openai: OpenAI;


export async function *evaluate(problem: string, optimizer: Node<string, string, string>): Generator<number, never, never> {
    let debate = await optimizer.next().then(r => r.value);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please examine the given answers of the given math problems.',
                'Print only `ACCEPT` if it is correct. Print reason if it is incorrect.',
            ].join(' '),
        },
        { role: 'user', content: `Problem: ${problem}\n\nAnswer: ${debate.extract()}` },
    ];

    for (;;) try {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        if (completion.choices[0]!.message.content === 'ACCEPT') {
            yield Draft.from([debate.signal], Number.parseInt(debate.extract()));
            throw new Error();
        } else {
            const opposition = await debate.next(Rejection.from(completion.choices[0]!.message.content!)).then(r => r.value);
            messages.push({
                role: 'user',
                content: `Your rejection is opposed: ${opposition.extract()}\n\nPlease examine it again.`,
            });
        }
    } catch (e) {
        if (e instanceof Draft.AbortError) {} else throw e;
        debate = await optimizer.next().then(r => r.value);
        messages.push({
            role: 'user',
            content: `The answer is updated: ${debate.extract()}\n\nPlease examine it again.`,
        });
    }
}
