#!/bin/sh

browserify nrama.bookmarklet.js -o nrama.bookmarklet.bundle_to_compile.js 

java -jar compiler.jar --js nrama.bookmarklet.bundle_to_compile.js  --js_output_file nrama.bookmarklet.bundle.js 



browserify nrama.contentscript.chrome-extension.js -o nrama.contentscript.chrome-extension.bundle_to_compile.js 
java -jar compiler.jar --js nrama.contentscript.chrome-extension.bundle_to_compile.js   --js_output_file ../../../nrama3_chrome_extension/nrama.contentscript.chrome-extension.bundle.js 
