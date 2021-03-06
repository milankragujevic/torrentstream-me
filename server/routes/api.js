var express = require('express');
var router = express.Router();

var webtorrent = require('webtorrent');
var client = new webtorrent()

getMovie = function (torrent) {
	var file;
	
	for (i = 0; i < torrent.files.length; i++) {
		if (!file || file.length < torrent.files[i].length) {
			file = torrent.files[i];
		}
	}
	
	return file
}

function cb () {}

router.get('/add/:torrent', function(req, res, next) {
	var torrent = req.params.torrent;
	
	console.log(torrent);

	try {
		client.add(torrent, function (torrent) {
			var file = getMovie(torrent);
			
			console.log('Adding torrent');

			torrent.swarm.on('upload', function() {
				console.log((torrent.ratio * 100).toFixed(2) + '%');
					
				if (torrent.length == torrent.downloaded && torrent.ratio >= 1.5) {
					console.log('Deleting torrent');
					torrent.swarm.destroy(cb);
					torrent.discovery.stop(cb);
				}
			});
			
			res.end();
		});
	}
	catch (err) {
		console.error('got error', err);
	}
});

router.get('/metadata/:torrent', function(req, res, next) {
	var torrent = req.params.torrent;

	try {
		var torrent = client.get(torrent);
		var file = getMovie(torrent);

		res.json({ torrent: torrent.infoHash, name: file.name, size: file.length });
	}
	catch (err) {
		console.error('got error', err);
	}
});

router.get('/stream/:torrent', function(req, res, next) {
	var torrent = req.params.torrent;

	try {
		var torrent = client.get(torrent);
		var file = getMovie(torrent);
		var total = file.length;

		var range = req.headers.range;
		var parts = range.replace(/bytes=/, "").split("-");
		var partialstart = parts[0];
		var partialend = parts[1];
		var start = parseInt(partialstart, 10);
		var end = partialend ? parseInt(partialend, 10) : total - 1;
		var chunksize = (end - start) + 1;

		console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

		var stream = file.createReadStream({start: start, end: end});
		res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
		stream.pipe(res);
	}
	catch (err) {
		console.error('got error', err);
	}
});

module.exports = router;
