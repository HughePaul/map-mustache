#!/bin/env node

'use strict';

/* eslint no-console: 0 */

const minimist = require('minimist');
const GraphvizPath = require('graphviz-path');
const glob = require('glob-promise');
const path = require('path');
const fs = require('fs-extra');

function processHtml(id, html, nodes) {
    let partials = [];
    let rePartials = /\{\{\s*>\s*([^\s}]+)\s*\}\}/g;
    let match;
    while ((match = rePartials.exec(html))) {
        let partial = match[1];
        partials.push(partial);
    }

    nodes.node(id);

    partials.forEach(partial => console.log(id, partial));
    partials.forEach(partial => nodes.edge(id, partial));
}

async function main(argv) {

    const dir = path.resolve(
        argv.dir ||
        argv.d ||
        argv._.shift() ||
        process.exit(process.stderr.write('npm start [-d] /directory/ [-o] map.svg\n') - 1));

    const extension =
        argv.extension ||
        argv.e ||
        '.mustache';

    const output = path.resolve(
        argv.o ||
        argv.output ||
        argv.svg ||
        argv._.shift() ||
        'map.svg');

    console.log('Generating map for %s for files *%s to %s', dir, extension, output);

    let nodes = new GraphvizPath({
        css: '.node { cursor: pointer; }'
    });

    let fileGlob = dir + '/**/*' + extension;
    let files = await glob(fileGlob);

    console.log('Reading files');
    for (let file of files) {
        let name = path.basename(file, extension);
        let group = path.dirname(file).substr(dir.length + 1);
        let id = group ? group + '/' + name : name;

        let html = await fs.readFile(file);
        processHtml(id, html, nodes);
    }

    console.log('Generating svg');
    let svg = nodes.svg();

    console.log('Writing svg');
    await fs.writeFile(output, svg, 'utf8');

    console.log('Done:', output);
}

const argv = minimist(process.argv.slice(2));
main(argv)
    .catch(e => console.error(e));
