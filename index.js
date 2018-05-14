#!/bin/env node

'use strict';

/* eslint no-console: 0 */

const minimist = require('minimist');
const GraphvizPath = require('graphviz-path');
const glob = require('glob-promise');
const path = require('path');
const fs = require('fs-extra');

function processHtml(id, html, nodes, group) {
    let match;

    nodes.node(id, { group });

    let rePartials = /\{\{\s*>\s*([^\s}]+)\s*\}\}/g;
    while ((match = rePartials.exec(html))) {
        let partial = match[1];
        nodes.edge(id, partial);
    }

    let reLayouts = /\{\{\s*<\s*([^\s}]+)\s*\}\}/g;
    while ((match = reLayouts.exec(html))) {
        let layout = match[1];
        nodes.edge(id, layout, { style: 'dashed' });
    }
}

async function main(argv) {

    const output = path.resolve(
        argv.o ||
        argv.output ||
        argv.svg ||
        'map.svg');

    const extension =
        argv.extension ||
        argv.e ||
        '.mustache';

    const dirs = argv._;

    if (argv.d) dirs.push(argv.d);
    if (argv.dir) dirs.push(argv.dir);

    if (!dirs.length) {
        process.stderr.write(
            'node . [[group=]prefix=]/directory ... [-o output.svg] [-e .extension] [-r]\n');
        process.exit(-1);
    }

    console.log('Generating map for files *%s to %s', extension, output);

    let nodes = new GraphvizPath();

    for (let dirArg of dirs) {
        let dirArgParts = dirArg.split('=');
        let dir = dirArgParts.pop();
        let prefix = dirArgParts.pop();
        let group = dirArgParts.pop();
        dir = path.resolve(dir);

        console.log('Reading files for %s (%s)', dir, prefix || 'no prefix');
        let fileGlob = dir + '/**/*' + extension;
        let files = await glob(fileGlob);

        for (let file of files) {
            let name = path.basename(file, extension);
            let relativeDir = path.dirname(file).substr(dir.length + 1);
            let id = relativeDir ? relativeDir + '/' + name : name;
            if (prefix) id = prefix + ': ' + id;

            let html = await fs.readFile(file);
            processHtml(id, html, nodes, group);
        }
    }

    if (!argv['dont-generate'])
        nodes.generateMissingNodes();

    if (argv['remove-unconnected'] || argv.r)
        nodes.removeUnconnectedNodes();

    console.log('Generating svg');
    let svg = nodes.svg();

    console.log('Writing svg');
    await fs.writeFile(output, svg, 'utf8');

    console.log('Done:', output);
}

const argv = minimist(process.argv.slice(2));
main(argv)
    .catch(e => console.error(e));
