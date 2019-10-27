# slam.js - Kleinkunst Competition Interactive Slides

This is an addon for the [reveal.js HTML presentation framework](https://github.com/hakimel/reveal.js), that allows to create interactive slides for live
competitions like poetry slams and the like.

The contestants present their contributions on stage and get rated by a jury or
by the audience. As the ratings are presented, they are entered into the control
interface and shown to the audience.

## Attributions

Slam.js is based on the [reveal.js framework](https://github.com/hakimel/reveal.js)
and in particular on the [server-notes plugin](https://github.com/hakimel/reveal.js/tree/master/plugin/notes-server).
It uses Node.js and can be installed via npm.

Some of the libraries in use are:

* [Bootstrap](https://github.com/twbs/bootstrap)
* [jQuery](https://github.com/jquery/jquery)
* [jsGrid](https://github.com/tabalinas/jsgrid)
* [lowdb](https://github.com/typicode/lowdb)
* [lowdb-api](https://github.com/rmariuzzo/lowdb-api)
* [socket.io](https://github.com/socketio/socket.io)

## Usage

Note: I'm not a web developer and therefore parts of the code are likely to look
ugly or perform bad. If you find issues please report them.

### Use a demo project

If you want to start with a ready-to-go demo, you can follow these steps.

1. Clone the demo repository.

       git clone https://github.com/fri-sch/ps-es-2018-slides.git
       cd ps-es-2018-slides

2. Install the dependencies.

       npm install

3. Run the server.

       node node_modules/slam.js

### Set up a new project

1. Create a directory for your project.

       mkdir slamjs-demo
       cd slamjs-demo

2. Install slam.js and its dependencies via npm.

       npm install https://github.com/fri-sch/slam.js.git

   Or just clone the git repository to your project and install its dependencies.

       git clone https://github.com/fri-sch/slam.js.git
       cd slam.js
       npm install
       cd ..

3. Create your slides in `slamjs-demo/index.html`.

4. Start the server by running node in the base directory of your project.

   If you installed slam.js via npm:

       node node_modules/slam.js

   If you installed slam.js manually to a subdirectory called 'slam.js':

       node slam.js

   You should see something like the following. Follow the instructions.

       slam.js - Kleinkunst Competition Interactive Slides
       1. Open the slides at http://localhost:1947
       2. The control page should open automatically in a separate window.
          If not, click on the link in your JS console
       3. Enter your competition data live and go through the slides as needed

## Events

I have written slam.js for "1. Esslinger Preacher Slam" in 2018. Since then it
received an almost complete rewrite to be ready for "2. Esslinger Preacher Slam"
on 26 October 2019.

If you happen to use slam.js for an event, please let me know or send a PR to
extend the list below.

* __1\. Esslinger Preacher Slam__ (early unpublished version)
  * [Video (German)](https://kirchenfernsehen.de/video/erster-esslinger-preacher-slam/)
  * Repository with ported slides (not the version actually used): https://github.com/fri-sch/ps-es-2018-slides
* __2\. Esslinger Preacher Slam__
  * Repository with slides: https://github.com/fri-sch/ps-es-2019-slides

## License

Licensed under the MIT license, see LICENSE file.

Copyright (C) 2018 Frieder Schrempf
