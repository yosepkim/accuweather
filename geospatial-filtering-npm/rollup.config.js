import resolve from '@rollup/plugin-node-resolve';  
import commonjs from '@rollup/plugin-commonjs';  
import copy from 'rollup-plugin-copy-assets';
import nodePolyfills from 'rollup-plugin-polyfill-node';

export default {  
  input: 'main.js',  
  external: ['log'],  
  output: {  
    format: 'es',  
    dir: 'dist/work',
    preserveModules: true
  },
  plugins: [  
    //Converts CommonJS modules to ES6 modules.  
    commonjs(),  
    //Helps Rollup resolve modules from the node_modules directory.  
    resolve(),  
    //Copies bundle.json and service-turf.js to the output directory  
    copy({  
      assets: ['./bundle.json']  
    }),
    nodePolyfills()  
  ]  
};