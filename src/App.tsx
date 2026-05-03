Skip to content
zkayafahri-ui
soh
Repository navigation
Code
Issues
Pull requests
Agents
Actions
Projects
Wiki
Security and quality
1
 (1)
Insights
Settings
Files
Go to file
t
T
public
src
components
data
pages
ArticleView.tsx
Blog.tsx
ChatPage.tsx
Home.tsx
services
utils
App.tsx
firebase.ts
index.css
main.tsx
types.ts
.gitignore
index.html
package-lock.json
package.json
tsconfig.json
vite.config.ts
soh/src
/
App.tsx
in
main

Edit

Preview
Indent mode

Spaces
Indent size

2
Line wrap mode

No wrap
Editing App.tsx file contents
  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
 30
 31
 32
 33
 34
 35
 36
import { useEffect, useState } from "react";
import Header from "./components/Header";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import ArticleView from "./pages/ArticleView";
import ChatPage from "./pages/ChatPage";
import { getCurrentUser } from "./services/chatService";

type Page = "home" | "chat" | "blog" | "article";

interface RouteState {
  page: Page;
  param?: string;
}

function parseHash(): RouteState {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return { page: "home" };
  const [page, param] = hash.split("/");
  if (page === "chat") return { page: "chat", param };
  if (page === "blog") return { page: "blog" };
  if (page === "article" && param) return { page: "article", param };
  return { page: "home" };
}

function setHash(page: Page, param?: string) {
  const url = "#/" + page + (param ? "/" + param : "");
  if (window.location.hash !== url) {
    window.location.hash = url;
  }
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(parseHash());
  const [user, setUser] = useState(getCurrentUser());

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
 
