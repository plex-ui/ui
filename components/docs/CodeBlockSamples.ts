export const CODE_BLOCK_SAMPLES = {
  base: `import ApiClient from "api-client";
const client = new ApiClient();

const stream = await client.completions.create({
  model: "model-4.1",
  messages: [{ role: "user", content: "Say 'double bubble bath' ten times fast." }],
  stream: true,
});

for await (const chunk of stream) {
  console.log(chunk.choices[0].delta);
}`,
  javascript: `async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

fetchData("https://api.example.com/data");`,
  json: `{
  "user": { "id": 1, "name": "Alice" },
  "roles": ["admin", "editor"],
  "active": true
}`,
  jsonc: `{
  // allowed comment
  "name": "Alice",
  /* multi-line comment */
  "age": 30
}`,
  python: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        print(f"Hi, I'm {self.name}")`,
  bash: `git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
docker build -t myapp:latest .`,
  sql: `SELECT u.id, u.name, COUNT(o.id) AS orders_count
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;`,
  xml: `<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
  </book>
</catalog>`,
  typescript: `interface User { id: number; name: string }

const createUser = (id: number, name: string): User => ({ id, name });
console.log(createUser(1, "Alice"));`,
  jsx: `const App = () => (
  <div>
    <h1>Hello, world!</h1>
  </div>
);

ReactDOM.render(<App />, document.getElementById("root"));`,
  tsx: `type Props = { title: string; count: number };

const Header = ({ title, count }: Props) => (
  <h1>{title} ({count})</h1>
);`,
  c: `#include <stdio.h>

int main() {
  printf("Hello, world!\\n");
  return 0;
}`,
  clike: `public class Hello {
  private String name;

  public Hello(String name) {
    this.name = name;
  }
}`,
  css: `.container {
  display: flex;
  align-items: center;
  min-height: 100vh;
}

.button:hover { cursor: pointer; }`,
  scss: `$primary-color: #3498db;

.button {
  color: #fff;
  background-color: $primary-color;

  &:hover { opacity: 0.9; }
}`,
  diff: `diff --git a/README.md b/README.md
@@ -1,3 +1,4 @@
 # Project Title
+Added line
 Context line`,
  docker: `FROM node:14
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]`,
  go: `package main

import "fmt"

func main() {
  fmt.Println("Hello, world")
}`,
  java: `public class Person {
  private String name;

  public Person(String name) {
    this.name = name;
  }
}`,
  kotlin: `data class User(val name: String, val age: Int)

fun greet(user: User): String {
  return "Hello, ${'$'}{user.name}!"
}`,
  php: `<?php

class Bar {
  public const BAZ = 'qux';

  public function doSomething(): void {
    echo self::BAZ;
  }
}`,
  ruby: `class Greeter
  def initialize(name)
    @name = name
  end

  def salute
    puts "Hello, #{@name}!"
  end
end`,
  markdown: `# Hello, world!

This is **Markdown** example.`,
  toml: `[package]
name = "example"
version = "0.1.0"

[dependencies]
serde = "1.0.117"`,
  yaml: `version: "3"
services:
  app:
    image: myapp
    ports:
      - "3000:3000"`,
  markup: `<html>
  <body>
    <h1>Hello, world!</h1>
  </body>
</html>`,
  customTypescript: `interface Point {
  x: number
  y: number
}

function printPoint(p: Point) {
  console.log("Point(" + p.x + ", " + p.y + ")");
}`,
  collapsible: `"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"

export function ProgressDemo() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return <Progress value={progress} />
}`,
} as const;

/** The languages the Code Block Overview offers, each with its sample: the grammars a page shows most, of the set
 * CodeBlock registers (React and Vue alike). JavaScript takes the longest sample, the one the page opens with. */
export const CODE_BLOCK_LANGUAGES = ['javascript', 'typescript', 'tsx', 'python', 'json', 'shell', 'css', 'sql', 'go'] as const;

export const CODE_BLOCK_LANGUAGE_SAMPLES: Record<(typeof CODE_BLOCK_LANGUAGES)[number], string> = {
  javascript: CODE_BLOCK_SAMPLES.base,
  typescript: CODE_BLOCK_SAMPLES.typescript,
  tsx: CODE_BLOCK_SAMPLES.tsx,
  python: CODE_BLOCK_SAMPLES.python,
  json: CODE_BLOCK_SAMPLES.json,
  shell: CODE_BLOCK_SAMPLES.bash,
  css: CODE_BLOCK_SAMPLES.css,
  sql: CODE_BLOCK_SAMPLES.sql,
  go: CODE_BLOCK_SAMPLES.go,
};
