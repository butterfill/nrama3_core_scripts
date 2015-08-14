This is a partial re-write of the nrama bookmarklet / page insert / firefox extension contentscript part of noteorama.

It is a self contained npm project.  Instructions on building (with browserify) are in nrama3/dist/.

The current source for the kanso couchdb app is still in the ../nrama2 folder.  (Actually the only relevant part of ./nrama2 this is ../nrama2/server; everything else has moved.)

Note that the server part of the noteoramra kanso couchdb app still uses the old bookmarklet code rather than this extension at present (TODO:fix!).

The current firefox extension is in nrama3_jpm_firefox_extension.  There isn't a current chrome extension (because I don't use Chrome much anymore).