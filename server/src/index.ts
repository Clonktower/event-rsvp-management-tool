import express, { Request, Response } from "express";
import router from "./routes";

const app = express();
const port = 3000;

app.use(express.json());
app.use(router);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World from TypeScript + Express!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
