import { apStyleTitleCase } from "https://esm.sh/ap-style-title-case@2.0.0?bundle";
import chicagoStyleTitleCase from "https://esm.sh/title@3.5.3?bundle";

function handleInput(form) {
    form.input.style.height = "";
    form.input.style.height = form.input.scrollHeight - 4 + "px";

    const searchParams = new URLSearchParams();
    if (form.variant.value !== "ap") {
        searchParams.set("variant", form.variant.value);
    }
    if (form.input.value !== "") {
        searchParams.set("input", encodeURIComponent(form.input.value));
    }
    if (searchParams.size > 0) {
        history.replaceState(null, null, `?${searchParams.toString()}`);
    } else {
        history.replaceState(null, null, location.pathname);
    }

    let getTitleCase =
        form.variant.value === "ap"
            ? (line) => apStyleTitleCase(line, { keepSpaces: true })
            : (line) =>
                  chicagoStyleTitleCase(line, {
                      special: line
                          .split(/\W+/)
                          .filter(
                              (word) =>
                                  Array.from(word.slice(1)).reduce(
                                      (acc, char) =>
                                          (acc += char.toUpperCase() === char),
                                      0
                                  ) > 0
                          ),
                  });

    form.output.value = form.input.value
        .split("\n")
        .map(getTitleCase)
        .join("\n");
}
window.handleInput = handleInput;

const searchParams = new URLSearchParams(window.location.search);
if (searchParams.has("variant")) {
    document.querySelector("form").variant.value = searchParams.get("variant");
    handleInput(document.querySelector("form"));
}
if (searchParams.has("input")) {
    document.querySelector("form").input.value = decodeURIComponent(
        searchParams.get("input")
    );
    handleInput(document.querySelector("form"));
}

function copy() {
    navigator.clipboard.writeText(document.querySelector("form").output.value);
    document
        .querySelector("form")
        .output.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 1000,
            easing: "cubic-bezier(.147,1.453,1)",
            fill: "both",
            iterations: 1,
            direction: "alternate",
            playbackRate: 0.5,
        });
}
window.copy = copy;
