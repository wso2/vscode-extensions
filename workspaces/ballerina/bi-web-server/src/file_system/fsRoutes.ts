import express, { Request, Response, NextFunction } from "express";
import * as path from "path";
import * as fs from "fs";
import simpleGit, { SimpleGit } from "simple-git";
import { SCHEME } from "../bal_ls/models";

const fsRouter = express.Router();
const git: SimpleGit = simpleGit();

export const BASE_DIR: string = path
  .join(path.resolve(__dirname, "../.."), "repos")
  .replace(/\\/g, "/"); // Base directory for all repos
export const BASE_DIR_1: string = path.join(
  path.resolve(__dirname, "../.."),
  "repos"
); // Base directory for all repos

fsRouter.get(
  "/clone/:userId/:repoName",
  async (req: Request, res: Response) => {
    console.log("base dir", BASE_DIR);
    const { userId, repoName } = req.params;
    const userRepoPath = path.join(BASE_DIR, userId, repoName);
    console.log("cloning into: ", userRepoPath);
    if (fs.existsSync(userRepoPath)) {
      res.send("Repo already exists");
      return;
    }

    try {
      await git.clone(
        `https://github.com/${userId}/${repoName}.git`,
        userRepoPath
      );
      res.send(`Repository cloned successfully for user: ${userId}`);
      console.log("cloned succesfully");
    } catch (error: any) {
      res.status(500).send(`Error cloning repo: ${error.message}`);
    }
  }
);

fsRouter.get("/stat", (req: Request, res: Response) => {
  const inputScheme = req.query.scheme as string;
  const inputUrl = req.query.url as string;
  const userRepoPath =
    inputScheme === SCHEME ? path.join(BASE_DIR, inputUrl) : inputUrl;
  if (!fs.existsSync(userRepoPath)) {
    res.status(404).send(`${req.query.url} not found.`);
  }
  const stats = fs.statSync(userRepoPath);
  res.send({
    isDirectory: stats.isDirectory(),
    ctime: 0,
    mtime: 0,
    size: stats.size,
  });
});

fsRouter.get("/read", (req: Request, res: Response, next: NextFunction) => {
  console.log("inside read scheme", req.query.scheme);
  const inputScheme = req.query.scheme as string;
  const inputUrl = req.query.url as string;
  const userRepoPath =
    inputScheme === SCHEME ? path.join(BASE_DIR, inputUrl) : inputUrl;
  console.log("searching repo: ", userRepoPath);

  if (fs.statSync(userRepoPath).isDirectory()) {
    console.log("requested is a directory");
    fs.readdir(userRepoPath, (err, files) => {
      if (err) {
        res.status(500).send("Unable to read directory");
      }

      const fileList = files.map((file) => {
        const filePath = path.join(userRepoPath, file);
        return {
          name: file,
          isDirectory: fs.statSync(filePath).isDirectory(),
        };
      });

      res.status(200).json(fileList);
    });
  } else if (fs.statSync(userRepoPath).isFile()) {
    console.log("requested is a file: ", userRepoPath);

    fs.readFile(userRepoPath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).send("Unable to read file");
      }
      console.log("this is the data of the file", data);
      res.status(200).send(data);
    });
  }
});

// fsRouter.get("/exists", (req: Request, res: Response) => {
//     const inputScheme = req.query.scheme as string;
//     const inputUrl = req.query.url as string;
//     const userRepoPath = inputScheme === SCHEME ? path.join(BASE_DIR, inputUrl) : inputUrl;
//     console.log("Checking existence: ", userRepoPath);

//     try {
//         if (fs.existsSync(userRepoPath)) {
//             const isDirectory = fs.statSync(userRepoPath).isDirectory();
//             res.status(200).json({ exists: true, isDirectory });
//         } else {
//             res.status(200).json({ exists: false, isDirectory });
//         }
//     } catch (err) {
//         console.error("Error checking existence:", err);
//         res.status(500).send("Error while checking existence");
//     }
// });

fsRouter.post("/write", (req: Request, res: Response) => {
  const userRepoPath = path.join(BASE_DIR, req.query.url as string);
  const { content } = req.body;
  console.log(`Writing content of this ${userRepoPath} is ${content}`);
  fs.writeFile(userRepoPath, content, (err) => {
    if (err) {
      return res.status(500).send("Unable to write file");
    }
    res.status(200).send("File written successfully");
  });
});

fsRouter.delete("/remove", (req: Request, res: Response) => {
  const inputPath = path.join(BASE_DIR, req.query.url as string);
  console.log("this is the path to be deleted", inputPath);

  fs.rm(inputPath, { recursive: true, force: true }, (err) => {
    if (err) res.status(500).send(`Error removing path: ${err.message}`);
    res.send(`Path ${inputPath} removed successfully.`);
  });
});

fsRouter.post("/mkdir", (req: Request, res: Response) => {
  const dirPath = path.join(BASE_DIR, req.query.url as string);

  // Check if the directory already exists
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Directory created successfully: ${dirPath}`);
      res.status(200).send("Directory created successfully");
    } catch (err) {
      console.error(`Error creating directory.`);
      res.status(500).send("Unable to create directory");
    }
  }
  console.log(`Directory already exists: ${dirPath}`);
  res.status(403).send("Directory already exists");
});

fsRouter.post("/rename", (req: Request, res: Response) => {
  const oldPath = path.join(BASE_DIR, req.query.oldUrl as string);
  const newPath = path.join(BASE_DIR, req.query.newUrl as string);

  // Check if the source file/folder exists
  if (!fs.existsSync(oldPath)) {
    res.status(404).send("Source file or folder not found");
  }

  try {
    fs.renameSync(oldPath, newPath); // Rename file or folder
    console.log(`Renamed: ${oldPath} -> ${newPath}`);
    res.status(200).send("Rename successful");
  } catch (err) {
    console.error(`Error renaming: ${err}`);
    res.status(500).send("Unable to rename file or folder");
  }
});

fsRouter.post("/copy", (req: Request, res: Response) => {
  const { source, destination, overwrite } = req.body;

  if (!source || !destination) {
    res.status(400).send("Source and destination paths are required.");
  }

  const sourcePath = path.join(BASE_DIR, source);
  const destinationPath = path.join(BASE_DIR, destination);

  if (!fs.existsSync(sourcePath)) {
    res.status(404).send("Source file or folder not found.");
  }

  if (fs.existsSync(destinationPath) && !overwrite) {
    res
      .status(409)
      .send("Destination already exists and overwrite is not allowed.");
  }

  try {
    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      fs.cpSync(sourcePath, destinationPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
    res.status(200).send("Copy successful");
  } catch (error) {
    console.error("Copy error:", error);
    res.status(500).send(`Failed to copy: ${error}`);
  }
});

fsRouter.get("/readbal", (req: Request, res: Response) => {
  const inputScheme = req.query.scheme as string;
  const inputUrl = req.query.url as string;
  let userRepoPath = inputUrl;
  if (
    SCHEME == inputScheme &&
    fs.statSync(path.join(BASE_DIR, inputUrl)).isDirectory()
  ) {
    userRepoPath = path.join(BASE_DIR, inputUrl);
    res.status(200).json(getAllBalFiles(userRepoPath, userRepoPath, inputUrl));
  } else {
    res.status(200).json([]);
  }
});

function getAllBalFiles(
  parentPath: string,
  basePath: string,
  inputPath: string
) {
  // c:/documents/folder
  let result: { relativePath: string; path: string }[] = [];
  const files = fs.readdirSync(parentPath);
  for (const file of files) {
    let fullPath = path.join(parentPath, file); // c:/documents/folder/subf1
    if (fs.statSync(fullPath).isDirectory() && !fullPath.endsWith(".git")) {
      result = result.concat(getAllBalFiles(fullPath, basePath, inputPath));
    } else if (file.endsWith(".bal") && !file.endsWith("test.bal")) {
      let relativePath = fullPath.replace(path.join(basePath, "modules"), "");
      relativePath = relativePath.replace(basePath, "");
      relativePath = relativePath.replace(/\\/g, "/");
      fullPath = fullPath.replace(/\\/g, "/");
      console.log(fullPath);
      console.log("base: ", basePath);
      fullPath = fullPath.replace(BASE_DIR, "");
      console.log(fullPath);
      result.push({
        relativePath: relativePath.substring(1),
        path: `${SCHEME}:${fullPath}`,
      });
    }
  }
  return result;
}

export default fsRouter;
