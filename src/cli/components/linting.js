const chalk = require("chalk");
const { chunkString, MSG_META, COLUMNS } = require("../util");
const stripAnsi = require("strip-ansi");

const Spinner = require("./spinner");

/** @typedef {import("../../lib/reporter.js")} Reporter */
/** @typedef {import("../../lib/linting.js")} Linting */

/**
 * Turns a results object into a flat array of Reporters, in a stable-sorted manner.
 * @param {Object<string,Reporter|Reporter[]>} results The results from the Linting
 * @returns {Reporter[]}
 */
function flattenReporters(results) {
    const outp = [];
    Object.keys(results).sort().forEach(
        reporterName => {
            const reporter = results[reporterName];
            const reporters = (reporter instanceof Array)
                ? reporter
                : [reporter];
            outp.push(...reporters);
        }
    );
    return outp;
}

/**
 * A display for a single linting.
 */
module.exports = class LintingDisplay {
    /** @param {Linting} linting */
    constructor(linting) {
        this.linting = linting;
        this.$spinner = new Spinner();
    }

    /**
     * Returns whether we should actively animate for the spinner.
     * @returns {Boolean}
     */
    shouldAnimate() {
        return this.linting.state === this.linting.STATES.linting;
    }

    /**
     * Returns the string representing the header of the linting display
     * @returns {String}
     */
    renderHeader() {
        const linting = this.linting;
        let symbol;
        for (let state of Object.keys(MSG_META)) {
            if (linting.state === linting.STATES[state]) {
                const meta = MSG_META[state];
                symbol = meta.color(state === "linting"
                    ? this.$spinner
                    : meta.symbol);
            }
        }
        return symbol + " " + chalk.bold.underline(linting.name);
    }

    /**
     * Returns the string representing all of our reporters
     * @returns {String}
     */
    renderReporters() {
        const outp = flattenReporters(this.linting.results)
            .map(reporter => new ReporterDisplay(reporter))
            .filter(display => display.shouldDisplay())
            .join("\n");
        if (outp.length) {
            return "\n" + outp;
        }
        return "";
    }

    toString() {
        return this.renderHeader()
            + this.renderReporters();
    }
};

class ReporterDisplay {
    constructor(reporter) {
        this.reporter = reporter;
    }

    shouldDisplay() {
        return !!this.reporter.messages.length;
    }

    formatMsg(msg) {
        const type = msg.type;
        const meta = MSG_META[type];
        const prefix = `  ${meta.color(meta.symbol + " " + this.reporter.name)}${msg._node
            ? chalk.gray.dim(` ${msg._node.lineNum}:${msg._node.columnNum}`)
            : ""
        } `;
        const prefixLength = stripAnsi(prefix).length;
        return prefix
            + chunkString((msg.message||"").toString() || "", COLUMNS - prefixLength - 1)
                .join("\n"+" ".repeat(prefixLength));
    }

    toString() {
        const msgs = this.reporter.messages.map(
            msg => this.formatMsg(msg)
        );
        return msgs.join("\n");
    }
}
