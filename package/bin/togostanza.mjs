#!/usr/bin/env node
import { runCli } from "../dist/cli.js";

process.exitCode = runCli(process.argv.slice(2));
