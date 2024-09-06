import 'dotenv/config';
import OpenAI from 'openai';

import { LiteralClient } from './src';

const literalClient = new LiteralClient();

const openai = new OpenAI();

// Instrument the OpenAI client
literalClient.instrumentation.openai();

async function main() {
  // This will be automagically logged by Literal AI
  await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say this is a test' }]
  });

  await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content:
          'Write a README document in markdown explaining the basic usage of the `with-csv` npm library.'
      }
    ]
  });

  await literalClient
    .run({
      name: 'Test run',
      input: {
        content:
          '{"question": ["how to code chat with pdf and use pdfplumber and ollama local",[]],"images_content": {}}'
      },
      output: {
        content: `To create a chat application that interacts with PDF files using \`pdfplumber\` and the Ollama local model in Chainlit, you can follow the example below. This example demonstrates how to upload a PDF, extract text using \`pdfplumber\`, and allow users to ask questions about its content using the Ollama model.
    
    ### Step 1: Install Required Packages
    Make sure you have the necessary packages installed:
    \`\`\`bash
    pip install chainlit pdfplumber langchain
    \`\`\`
    
    ### Step 2: Create the Application Script
    Create a Python file named \`app.py\` and add the following code:
    
    \`\`\`python
    import os
    import pdfplumber
    import chainlit as cl
    from langchain.llms.ollama import Ollama
    from langchain.prompts import ChatPromptTemplate
    from langchain.schema import StrOutputParser
    from langchain.schema.runnable import Runnable
    from langchain.schema.runnable.config import RunnableConfig
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.memory import ChatMessageHistory, ConversationBufferMemory
    from langchain.schema import Document
    
    # Initialize the Ollama model
    model = Ollama(model="llama2")
    
    @cl.on_chat_start
    async def on_chat_start():
        files = await cl.AskFileMessage(
            content="Please upload a PDF file to start asking questions.",
            accept=["application/pdf"],
            max_size_mb=20,
            timeout=180,
        ).send()
    
        file = files[0]
        docs = process_pdf(file)
        
        message_history = ChatMessageHistory()
        memory = ConversationBufferMemory(memory_key="chat_history", output_key="answer", chat_memory=message_history, return_messages=True)
    
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", "You're a knowledgeable assistant who provides accurate answers based on the PDF content."),
                ("human", "{question}"),
            ]
        )
        
        runnable = prompt | model | StrOutputParser()
        cl.user_session.set("runnable", runnable)
    
        await cl.Message(content="You can now ask questions about the PDF!").send()
    
    def process_pdf(file):
        text = ""
        with pdfplumber.open(file.path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\
    "
        
        # Split the text into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitter.split_text(text)
        documents = [Document(page_content=chunk) for chunk in docs]
        return documents
    
    @cl.on_message
    async def on_message(message: cl.Message):
        runnable = cl.user_session.get("runnable")  # type: Runnable
        msg = cl.Message(content="")
    
        for chunk in await cl.make_async(runnable.stream)(
            {"question": message.content},
            config=RunnableConfig(callbacks=[cl.LangchainCallbackHandler()]),
        ):
            await msg.stream_token(chunk)
    
        await msg.send()
    \`\`\`
    
    ### Step 3: Run the Application
    To start the Chainlit application, run the following command in your terminal:
    \`\`\`bash
    chainlit run app.py
    \`\`\`
    
    ### Step 4: Interact with the Application
    Open your browser and navigate to \`http://localhost:8000\`. You can upload a PDF file and start asking questions about its content.
    
    ### Explanation
    - **PDF Processing**: The \`process_pdf\` function uses \`pdfplumber\` to extract text from the uploaded PDF file.
    - **Text Splitting**: The extracted text is split into manageable chunks using \`RecursiveCharacterTextSplitter\`.
    - **Ollama Model**: The Ollama model is used to generate responses based on the extracted text.
    - **Conversational Interface**: Users can ask questions, and the model will respond based on the content of the PDF.
    
    This setup allows you to create a conversational interface that can answer questions based on the content of a PDF file using \`pdfplumber\` and the Ollama local model.`
      }
    })
    .send();
}

main();
