// ==UserScript==
// @name          Extra MusicBrainz/AcoustID integration
// @description   Display additional AcoustID data on MusicBrainz
// @include       http://musicbrainz.org/puid/*
// @include       http://musicbrainz.org/artist/*/recordings*
// @include       http://musicbrainz.org/release/*
// @include       http://beta.musicbrainz.org/puid/*
// @include       http://beta.musicbrainz.org/artist/*/recordings*
// @include       http://beta.musicbrainz.org/release/*
// ==/UserScript==

function injected() {

	function buildAcoustidTable(tracks, mbid) {
		var tbl = $('<table class="tbl"><thead><tr><th>AcoustID</th><th style="width:5em;">Actions</th></tr></thead><tbody></tbody></table>');
		for (var i = 0; i < tracks.length; i++) {
			var row = $('<tr><td><code><a></a></code></td><td><a></a></td></tr>');
            if (i % 2 == 1) {
			    row.addClass('ev');
            }
            if (tracks[i].disabled) {
                row.find('a').first()
                    .css('text-decoration', 'line-through')
                    .css('opacity', '0.5');
            }
			var link = row.find('a').first();
			link.attr('href', 'http://acoustid.org/track/' + tracks[i].id);
			link.text(tracks[i].id);
            if (mbid) {
			    link = row.find('a').last();
    			link.attr('href', 'http://acoustid.org/edit/toggle-track-mbid?track_gid=' + tracks[i].id + '&mbid=' + mbid + '&state=' + (tracks[i].disabled ? '0' : '1'));
			    link.text(tracks[i].disabled ? 'Link' : 'Unlink');
            }
			tbl.find('tbody').append(row);
		}
		return tbl;
	}

	function updatePUIDPage(puid) {
		$.getJSON("http://api.acoustid.org/v2/track/list_by_puid?format=jsonp&jsoncallback=?",
			{ 'puid': puid },
			function(json) {
				$('#page').append('<h2>Associated with AcoustIDs</h2>');
				if (json.tracks.length) {
					$('#page').append(buildAcoustidTable(json.tracks));
				}
				else {
					$('#page').append('<p>This PUID does not have any associated AcoustID tracks</p>');
				}
			}
		);
	}

	function extractRecordingMBID(link) {
		if (link !== undefined) {
			var parts = link.href.split('/');
			if (parts[3] == 'recording') {
				return parts[4];
			}
		}
	}

	function findAcoustIDsByMBIDsInternal(mbids, result, callback) {
		var remaining_mbids = [];
		if (mbids.length > 50) {
			remaining_mbids = mbids.slice(50);
			mbids = mbids.slice(0, 50);
		}
		$.ajax({
			url: "http://api.acoustid.org/v2/track/list_by_mbid?format=jsonp&batch=1&jsoncallback=?",
			dataType: 'json',
			data: { 'mbid': mbids },
			traditional: true,
			success: function(json) {
				for (var i = 0; i < json.mbids.length; i++) {
					result.mbids.push(json.mbids[i]);
				}
				if (remaining_mbids.length > 0) {
					findAcoustIDsByMBIDsInternal(remaining_mbids, result, callback);
				}
				else {
					callback(result);
				}
			}
		});
	}

	function findAcoustIDsByMBIDs(mbids, callback) {
		if (mbids.length == 0) {
			return;
		}
		var result = {'mbids': []}
		findAcoustIDsByMBIDsInternal(mbids, result, callback);
	}

	function updateArtistRecordingsPage() {
		var mbids = [];
		$('.tbl tr td:nth-child(2) a').each(function(i, link) {
			var mbid = extractRecordingMBID(link);
			if (mbid !== undefined) {
				mbids.push(mbid);
			}
		});
		if (mbids.length == 0) {
			return;
		}
		findAcoustIDsByMBIDs(mbids, function(json) {
			var has_acoustids = {};
			for (var i = 0; i < json.mbids.length; i++) {
				has_acoustids[json.mbids[i].mbid] = json.mbids[i].tracks.length > 0;
			}
			$('.tbl tr td:nth-child(2)').each(function(i, td) {
				var mbid = extractRecordingMBID($(td).find('a').get(0));
				if (mbid === undefined) {
					return
				}
				if (has_acoustids[mbid]) {
					var a = $('<a href="#"><img src="http://acoustid.org/static/acoustid-wave-12.png" alt="AcoustID" /></a>');
					a.attr('href', 'http://musicbrainz.org/recording/' + mbid + '/fingerprints');
					a.css({'float': 'right'});
					$(td).find('a:first').after(a);
				}
			});
		});
	}

	var match = window.location.href.match(/puid\/([A-Fa-f0-9-]+)/);
	if (match) {
		updatePUIDPage(match[1]);
	}
	else {
		var match = window.location.href.match(/artist\/[A-Fa-f0-9-]+\/recordings/);
		if (match) {
			updateArtistRecordingsPage();
		}
		else {
			var match = window.location.href.match(/release\/[A-Fa-f0-9-]+/);
			if (match) {
				updateArtistRecordingsPage(); // works on the release page too
			}
		}
	}

}

var script = document.createElement('script');
script.appendChild(document.createTextNode('('+ injected +')();'));
document.body.appendChild(script);

