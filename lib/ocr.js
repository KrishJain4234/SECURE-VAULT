import { createWorker } from 'tesseract.js';

export const extractTextFromImage = async (imageFile) => {
  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(imageFile);
  await worker.terminate();
  return text;
};