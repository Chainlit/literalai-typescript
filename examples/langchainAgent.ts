import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { AgentExecutor } from 'langchain/agents';
import { formatXml } from 'langchain/agents/format_scratchpad/xml';
import { XMLAgentOutputParser } from 'langchain/agents/xml/output_parser';
import { ChatPromptTemplate } from 'langchain/prompts';
import { AgentStep } from 'langchain/schema';
import { RunnableSequence } from 'langchain/schema/runnable';
import { Tool, ToolParams } from 'langchain/tools';
import { renderTextDescription } from 'langchain/tools/render';

import { LiteralClient } from '../src';

// Define the model with stop tokens.
const model = new ChatOpenAI({ temperature: 0 }).bind({
  stop: ['</tool_input>', '</final_answer>']
});

class SearchTool extends Tool {
  static lc_name() {
    return 'SearchTool';
  }

  name = 'search-tool';

  description = 'This tool preforms a search about things and whatnot.';

  constructor(config?: ToolParams) {
    super(config);
  }

  async _call(_: string) {
    return '32 degrees';
  }
}

const tools = [new SearchTool()];

const template = `You are a helpful assistant. Help the user answer any questions.

You have access to the following tools:

{tools}

In order to use a tool, you can use <tool></tool> and <tool_input></tool_input> tags. \
You will then get back a response in the form <observation></observation>
For example, if you have a tool called 'search' that could run a google search, in order to search for the weather in SF you would respond:

<tool>search</tool><tool_input>weather in SF</tool_input>
<observation>64 degrees</observation>

When you are done, respond with a final answer between <final_answer></final_answer>. For example:

<final_answer>The weather in SF is 64 degrees</final_answer>

Begin!

Question: {input}`;

const prompt = ChatPromptTemplate.fromMessages([
  ['human', template],
  ['ai', '{agent_scratchpad}']
]);

const outputParser = new XMLAgentOutputParser();

const runnableAgent = RunnableSequence.from([
  {
    input: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) => i.input,
    tools: (i: { input: string; tools: Tool[]; steps: AgentStep[] }) =>
      renderTextDescription(i.tools),
    agent_scratchpad: (i: {
      input: string;
      tools: Tool[];
      steps: AgentStep[];
    }) => formatXml(i.steps)
  },
  prompt,
  model,
  outputParser
]);

const executor = AgentExecutor.fromAgentAndTools({
  agent: runnableAgent,
  tools
});

console.log('Loaded executor');

async function main() {
  const client = new LiteralClient();

  // Create the thread
  const thread = await client.thread({ name: 'yoyo' }).upsert();
  const input = 'What is the weather in SF?';
  const response = await executor.invoke(
    { input, tools },
    {
      callbacks: [client.instrumentation.langchain.literalCallback(thread.id)]
    }
  );
  console.log(response);
}

main();
