import { Draft, Opposition, Generator } from '@zimtsui/dagflow';
import OpenAI from 'openai';
declare const openai: OpenAI;


export async function *optimize(problem: string): Generator<string, string, string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        {
            role: 'system',
            content: [
                'Please solve math problems.',
                'Your answer will be evaluated and the feedback will be provided if the answer is rejected.',
                'Output "OPPOSE" to insist your answer.'
            ].join(' ')
        },
        { role: 'user', content: problem },
    ];
    for (;;) {
        const completion = await openai.chat.completions.create({ model: 'gpt-4o', messages });
        messages.push(completion.choices[0]!.message);
        const feedback = completion.choices[0]!.message.content! === 'OPPOSE'
            ? yield Opposition.from('My answer is correct.')
            : yield Draft.from([], completion.choices[0]!.message.content!);
        if (feedback instanceof Opposition.Instance) {
            const rejection = feedback;
            messages.push({
                role: 'user',
                content: `Your answer is rejected: ${rejection.extract()}. Please revise your answer.`,
            });
        } else return yield *optimize(problem);
    }
}
