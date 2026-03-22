import express , { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
	res.status(200).send('OK');
});

app.listen(port, () => {
	console.log(`API server listening on port ${port}`);
});
