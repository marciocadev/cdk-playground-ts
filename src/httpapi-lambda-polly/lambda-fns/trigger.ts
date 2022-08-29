import phin from 'phin';

export const handler = async() => {
  await phin({
    url: process.env.URL as string,
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    data: 'Testando o deploy da stack',
  });
};