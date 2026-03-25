---
title: "Pipes All the Way Down"
date: 2026-03-24
draft: false
description: "An interactive exploration of the Unix pipeline philosophy through image manipulation"
tags:
  - unix-philosophy
  - image-processing
  - interactive
---

In 1964, Doug McIlroy wrote a memo that changed how we think about programs. He wanted tools that connected cleanly, like a garden hose: screw two ends together and water flows. His idea took shape as the Unix pipe.

Fifty years later you still use it every day. `ls | grep .ts | wc -l`. Three programs, two pipes, one number. Each program has no idea the others exist. They all just read from stdin and write to stdout, and the shell handles the plumbing.

This post explores that idea through image processing. Instead of text streams, we have pixel buffers. Instead of `grep` and `sed`, we have `blur`, `rotate`, and `grayscale`. The plumbing is the same.

<div id="chop-pipelines">

## One Thing Well

McIlroy's first rule: write programs that do one thing and do it well.

A `grayscale` command converts pixels to luminance values. That is all it does. It does not resize, rotate, or compress. It does not ask what you plan to do next. It takes pixels in and puts pixels out, and it does that one thing correctly.

This constraint sounds limiting but it is the source of power. A program that does one thing can be composed with any other program that does one thing. A program that does many things can only be composed with programs that expect that exact combination.

The widget below shows individual operations in isolation. Pick an operation, adjust its parameter, and watch the result. Notice how each one has a clear, bounded effect.

<div id="chop-one-thing"></div>

## The Pipe

When you write `cat image | grayscale | blur 5`, something interesting happens. The shell connects the output of each program directly to the input of the next. The intermediate images never need a name. They exist only as data flowing from one process to the next.

This is what makes pipelines powerful: order matters, not identity. You can blur before grayscaling or after, and you get different results. The pipeline is a recipe, and the order of steps is the recipe's logic.

Pipelines also fail gracefully. If one step errors, the downstream steps never run. You do not get silently corrupted output. You get a stopped pipeline and a clear failure point.

Click the operation buttons to build a pipeline. Click a node in the visualization to remove that step. The JSON below the pipeline shows the serialized form of what you built.

<div id="chop-the-pipe"></div>

## More Than One

A single stream is useful. But sometimes you have two images and you want to work on them in parallel before combining them. This is where the `--as` and `--on` flags come in.

`chop load a.png --as left | blur 3 --on left | load b.png --as right | rotate 90 --on right | hstack`

The context is now a dictionary: a named slot for each image. `--as` loads an image into a named slot. `--on` targets an operation at a specific slot. `hstack` reads all slots and stacks them side by side.

This is still a pipeline. Each step takes a context and returns a context. The context just happens to hold multiple images instead of one. The composition at the end (hstack, vstack, overlay) collapses the dictionary back into a single image.

The widget below lets you build multi-image pipelines. Notice how the visualization splits into parallel tracks, one per named image, converging at the composition step.

<div id="chop-more-than-one"></div>

## Programs as Data

Here is the part most people miss: a pipeline is just a list of instructions. You can write it down, save it to a file, send it to a friend, and run it on a different image.

The JSON you saw in the previous sections is not a side effect. It is the canonical representation of the pipeline. The visualization is derived from it. The execution is driven by it. The JSON is the program.

This is what McIlroy meant by composability at a deeper level. Not just that programs can be connected at runtime, but that the connection itself can be treated as data. You can write programs that generate pipelines. You can write programs that transform pipelines. You can store pipelines in a database and run them later.

Lazy evaluation is the mechanism. The pipeline does not run when you add a step. It runs when you ask for the output. This means you can build up a recipe incrementally, inspect it, modify it, and only then commit to the computation.

Build a recipe here by adding operations. Watch the JSON update in real time. Apply the same recipe to different images and see how they diverge.

<div id="chop-programs-data"></div>

## Putting It Together

The sandbox below has everything: multiple image slots, all available operations, composition steps, and a download button. There are no constraints on what you can build.

A few things worth trying: load two images and overlay one on the other with reduced opacity. Build a pipeline with five or six steps and watch the JSON grow. Apply an aggressive blur, then an edge-detect, and see what comes out.

The interesting thing about an unconstrained sandbox is what you reach for first. That usually tells you something about which operations feel natural to compose and which feel like dead ends.

<div id="chop-sandbox"></div>
</div>

<!-- inject:style -->
<!-- inject:script -->
