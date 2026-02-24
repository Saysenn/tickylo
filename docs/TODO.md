BEDROCK
AI Employee Performance Insights
and this AI Report Generator

```
import { BedrockRuntimeClient, InvokeModelCommand }
from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

const command = new InvokeModelCommand({
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 800,
  }),
});

const response = await client.send(command);
```

# flow synchro

Frontend
→ sends POST /api/ai/generate
API
→ fetch employee data from DB
→ compute performance metrics
→ send structured data + prompt to Bedrock
→ receive AI-generated report (text)
→ generate PDF from AI text
→ save PDF file (S3 / local / DB as blob)
→ save report record in ai_reports table (include PDF URL)
→ return AI text + PDF URL to Frontend
Frontend
→ displays report preview
→ allows user to download PDF

# flow async

🟣 SCALABLE / Async Version (Recommended if many PDFs)
Frontend
→ sends POST /api/ai/generate
API
→ save request (status: processing)
→ push job to Redis/SQS queue
→ return 202 Accepted
Frontend
→ shows "Generating..."
Background Worker
Worker
→ pulls job from queue
→ fetch employee data
→ compute metrics
→ send to Bedrock
→ receive AI text report
→ generate PDF from AI text
→ save PDF (S3 / storage)
→ update ai_reports table with PDF URL and status: completed
Frontend Polling
Frontend
→ sends GET /api/ai/status?id=123
API
→ checks DB
→ returns status + PDF URL (if ready)
Frontend
→ displays download button when ready

npm install bullmq ioredis
npm install puppeteer # for PDF generation
npm install @aws-sdk/client-bedrock-runtime

```
1️⃣ Install Dependencies

Since you’ll use Redis queue + worker, install:

npm install bullmq ioredis
npm install puppeteer # for PDF generation
npm install @aws-sdk/client-bedrock-runtime

BullMQ = queue manager for Node.js

ioredis = Redis client

Puppeteer = generate PDFs from HTML (fancy styling)

Bedrock SDK = call AWS Bedrock

2️⃣ Setup Redis Queue

Create a file queue.ts:

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);

// Queue to push AI jobs
export const aiQueue = new Queue('ai-jobs', { connection });

// Worker to process AI jobs
export const aiWorker = new Worker(
  'ai-jobs',
  async (job: Job) => {
    const { employeeData, reportType, requestId } = job.data;

    // 1️⃣ Call Bedrock
    const aiResponse = await generateAIReport(employeeData, reportType);

    // 2️⃣ Generate PDF
    const pdfUrl = await generatePDF(aiResponse, requestId);

    // 3️⃣ Save result in DB
    await saveAIReportToDB(requestId, aiResponse, pdfUrl);

    return { aiResponse, pdfUrl };
  },
  { connection }
);
3️⃣ Trigger Job from Next.js API

Create pages/api/ai/generate.ts:

import type { NextApiRequest, NextApiResponse } from 'next';
import { aiQueue } from '@/lib/queue';
import { saveAIRequestToDB } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { employeeId, reportType } = req.body;

  // 1️⃣ Save request to DB
  const requestId = await saveAIRequestToDB(employeeId, reportType);

  // 2️⃣ Push job to queue
  await aiQueue.add('generate-report', {
    employeeData: { employeeId }, // can fetch full metrics in worker
    reportType,
    requestId,
  });

  // 3️⃣ Return immediately (async)
  res.status(202).json({ requestId, status: 'processing' });
}
4️⃣ Worker Functions (Separate Service)

services/ai.service.ts:

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import puppeteer from 'puppeteer';
import { uploadToS3 } from './s3'; // your S3 upload logic

export async function generateAIReport(employeeData: any, reportType: string) {
  const client = new BedrockRuntimeClient({ region: 'us-east-1' });

  const prompt = `
You are an HR analyst. Generate a ${reportType} report for this employee:
${JSON.stringify(employeeData)}
`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
  });

  const response = await client.send(command);
  const text = Buffer.from(await response.body.arrayBuffer()).toString('utf-8');
  return text;
}

export async function generatePDF(aiText: string, requestId: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const html = `
    <html>
      <body>
        <h1>Employee Report</h1>
        <pre>${aiText}</pre>
      </body>
    </html>
  `;

  await page.setContent(html);
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  // Upload to S3
  const pdfUrl = await uploadToS3(pdfBuffer, `reports/${requestId}.pdf`);
  return pdfUrl;
}
5️⃣ Frontend Polling Example
const fetchReport = async (requestId: string) => {
  const res = await fetch(`/api/ai/status?requestId=${requestId}`);
  const data = await res.json();
  if (data.status === 'completed') {
    console.log('PDF ready:', data.pdfUrl);
  } else {
    // retry after a few seconds
    setTimeout(() => fetchReport(requestId), 3000);
  }
};
```
