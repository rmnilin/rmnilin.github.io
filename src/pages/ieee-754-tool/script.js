/**
 * @type {[
 *     {
 *         i32ToF32: (number: number) => number,
 *         f32ToI32: (number: number) => number,
 *         f64ToI64: (number: number) => BigInt,
 *         i64ToF64: (number: BigInt) => number,
 *     },
 *     f64ToString: (number: number) => string,
 * ]}
 */ const [{ i32ToF32, f32ToI32, f64ToI64, i64ToF64 }, f64ToString] =
    await Promise.all([
        fetch("./type-punning.wasm")
            .then((response) => response.arrayBuffer())
            .then((buffer) => WebAssembly.instantiate(buffer))
            .then((module) => module.instance.exports),

        fetch("./f64-to-chars.wasm")
            .then((response) => response.arrayBuffer())
            .then((buffer) => WebAssembly.instantiate(buffer))
            .then((module) => module.instance)
            .then((instance) => (number) => {
                const memory = instance.exports.memory;
                let offset = instance.exports.f64_to_chars(number);
                let string = "";
                while (true) {
                    const [char] = new Uint8Array(memory.buffer, offset++, 1);
                    if (char === 0) {
                        break;
                    }
                    string += String.fromCharCode(char);
                }
                return string;
            }),
    ]);

const form = document.querySelector("form");

const searchParams = new URLSearchParams(window.location.search);
form.input.value = searchParams.get("input") || "0";
form.step.value = searchParams.get("step") || "0.1";
update();

function update() {
    const searchParams = new URLSearchParams();
    if (form.input.value !== "0") {
        searchParams.set("input", form.input.value);
    }
    if (form.step.value !== "0.1") {
        searchParams.set("step", form.step.value);
    }
    history.replaceState(
        null,
        null,
        searchParams.size > 0
            ? `?${searchParams.toString()}`
            : location.pathname
    );

    form.input.step = form.step.value;

    const input = form.input.value;
    const inputParsed = parseFloat(input);

    const bits32 = f32ToI32(inputParsed);
    const bits64 = f64ToI64(inputParsed);

    // Sign
    const signBit = +!!(bits32 >> 31);
    form.signBit.value = signBit;
    form.signDecoded.value = (-1) ** signBit;

    // Exponent
    const exponentBits32 = (bits32 >> 23) & 0xff;
    for (let i = 0; i < 8; i++) {
        form.exponentBit[7 - i].value = (exponentBits32 >> i) & 1;
    }

    const exponentBits64 = Number((bits64 >> 52n) & 0x7ffn);
    for (let i = 0; i < 11; i++) {
        form.exponentBit[8 + 10 - i].value = (exponentBits64 >> i) & 1;
    }

    const exponent32 = exponentBits32 - 127;
    form.exponentDecoded[0].innerHTML = `2<sup>${exponent32}</sup>`;

    const exponent64 = exponentBits64 - 1023;
    if (exponent32 === exponent64) {
        form.exponentDecoded[0].parentNode.rowSpan = 2;
        form.exponentDecoded[1].parentNode.style.display = "none";
    } else {
        form.exponentDecoded[0].parentNode.removeAttribute("rowspan");
        form.exponentDecoded[1].parentNode.style.display = "";
        form.exponentDecoded[1].innerHTML = `2<sup>${exponent64}</sup>`;
    }

    // Significand
    const significandBits32 = bits32 & 0x7fffff;
    let significandDecoded32 = 1;
    for (let i = 0; i < 23; i++) {
        const bit = (significandBits32 >> i) & 1;
        form.significandBit[22 - i].value = bit;
        significandDecoded32 += bit * 2 ** (-23 + i);
    }

    const significandBits64 = bits64 & 0xfffffffffffffn;
    let significandDecoded64 = 1;
    for (let i = 0; i < 52; i++) {
        const bit = Number((significandBits64 >> BigInt(i)) & 1n);
        form.significandBit[23 + 51 - i].value = bit;
        significandDecoded64 += bit * 2 ** (-52 + i);
    }

    form.significandDecoded[0].value = trimNumberString(
        f64ToString(significandDecoded32)
    );
    if (significandDecoded32 === significandDecoded64) {
        form.significandDecoded[0].parentNode.rowSpan = 2;
        form.significandDecoded[1].parentNode.style.display = "none";
    } else {
        form.significandDecoded[0].parentNode.removeAttribute("rowspan");
        form.significandDecoded[1].parentNode.style.display = "";
        form.significandDecoded[1].value = trimNumberString(
            f64ToString(significandDecoded64)
        );
    }

    // Output
    const output32 = f64ToString(i32ToF32(bits32));
    form.output[0].value = trimNumberString(output32);
    const output64 = f64ToString(inputParsed);
    if (output32 === output64) {
        form.output[0].parentNode.rowSpan = 2;
        form.output[1].parentNode.style.display = "none";
    } else {
        form.output[0].parentNode.removeAttribute("rowspan");
        form.output[1].parentNode.style.display = "";
        form.output[1].value = trimNumberString(output64);
    }

    // Error
    const [integer, fractional] = [...input.split("."), ""];
    const inputInteger = BigInt(integer + fractional.padEnd(1074, "0"));
    function getError(output) {
        if (isNaN(output)) {
            return "";
        }
        let error = BigInt(output.replace(".", "")) - inputInteger;
        const errorSign = error < 0 ? "-" : "";
        error = String(error).replace("-", "").padStart(1075, "0");
        error =
            errorSign +
            trimNumberString(
                error.slice(0, error.length - 1074) +
                    "." +
                    error.slice(error.length - 1074)
            );
        return error;
    }

    let error32 = getError(output32);
    form.error[0].value = error32;

    let error64 = getError(output64);
    if (error32 === error64) {
        form.error[0].parentNode.rowSpan = 2;
        form.error[1].parentNode.style.display = "none";
    } else {
        form.error[0].parentNode.removeAttribute("rowspan");
        form.error[1].parentNode.style.display = "";
        form.error[1].value = error64;
    }
}
window.update = update;

function trimNumberString(string) {
    return string.replace(/((?<=\.\d+)0+|\.0+)$/, "");
}

/**
 * @param {HTMLInputElement} input
 */
function updateStep() {
    form.input.step = form.step.value;
}
window.updateStep = updateStep;

document.querySelectorAll('output[name$="Bit"]').forEach((output) => {
    const index = Array.from(form[output.name]).indexOf(output);
    let equivalentBitOutput;
    switch (output.name) {
        case "significandBit": {
            if (index < 23) {
                equivalentBitOutput = output.form.significandBit[index + 23];
            } else if (index < 46) {
                equivalentBitOutput = output.form.significandBit[index - 23];
            }
            break;
        }
        case "exponentBit": {
            if (index < 8) {
                equivalentBitOutput = output.form.exponentBit[index + 11];
            } else if (index > 10) {
                equivalentBitOutput = output.form.exponentBit[index - 11];
            }
        }
    }

    output.addEventListener("mouseover", (event) => {
        equivalentBitOutput?.classList.add("highlight");
    });
    output.addEventListener("mouseout", (event) => {
        equivalentBitOutput?.classList.remove("highlight");
    });

    let flipBit;
    const input = form.input;
    if (output.name === "signBit") {
        flipBit = () =>
            (input.value = input.value.startsWith("-")
                ? input.value.slice(1)
                : "-" + input.value);
    } else if (
        (output.name === "exponentBit" && index < 8) ||
        (output.name === "significandBit" && index < 23)
    ) {
        flipBit = () => {
            let value = +form.signBit.value << 31;
            for (let i = 0; i < 8; i++) {
                value |= +form.exponentBit[i].value << (30 - i);
            }
            for (let i = 0; i < 23; i++) {
                value |= +form.significandBit[i].value << (22 - i);
            }

            const bitIndex = (output.name === "exponentBit" ? 30 : 22) - index;
            value ^= 1 << bitIndex;

            form.input.value = trimNumberString(f64ToString(i32ToF32(value)));
        };
    } else {
        flipBit = () => {
            let value = BigInt(form.signBit.value) << 63n;
            for (let i = 0; i < 11; i++) {
                value |= BigInt(form.exponentBit[8 + i].value) << BigInt(62 - i);
            }
            for (let i = 0; i < 52; i++) {
                value |= BigInt(form.significandBit[23 + i].value) << BigInt(51 - i);
            }

            const bitIndex = (output.name === "exponentBit" ? 70 : 74) - index;
            value ^= 1n << BigInt(bitIndex);

            form.input.value = trimNumberString(f64ToString(i64ToF64(value)));
        };
    }

    output.addEventListener("click", () => {
        flipBit();
        update();
    });
});
