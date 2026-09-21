import "./style.css";
import { initRouter } from "./router";

const view = document.getElementById("view") as HTMLElement;
const backLink = document.getElementById("back-link") as HTMLAnchorElement;

initRouter(view, backLink);
