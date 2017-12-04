# Webcam recording and uploading scripts for Kaltura CE

Summary
------

This is a webcam recording and uploading software (scripts) for the Kaltura Community Edition (CE).
This software is developed by "Tomoya Saito".
By using this software, users can recording a video by using PC's web-camera, and can upload the video to the Kaltura server.

This software use the WebRTC API, and includes the JQuery library and the Kaltura PHP 5 API Client Library.

Requirements
------

* PHP5.6 or greater.
* Web browsers must support the JavaScript, WebRTC and HTML5.
* For some browsers, you should be set your browser allow it to use web-cameras and microhpones. 

Installation
------

1. Unzip this software, and put all files in your Kaltura's web server.
2. Modify constant values (parameters) in "webcam_uploader.php" according to your Kaltura server's environment and configurations.
3. In order to allow users to access "webcam_uploader.php", it may be required to modify the configurations of httpd (Apache etc).

How to use
------

1. Click "Recording" icon to start a recording.
2. Click "Stop" icon to finish the recording.
3. Preview recorded video by using HTML5 player in preview area.
4. Fill the metadata(name,tags, and description) of redcorded video.
5. Click the "Upload" button.

License
------

* This software is distributed under the GNU Affero General Public License (AGPL) Version 3 (http://www.gnu.org/licenses/agpl-3.0.html) and later.
* This software includes the "Kaltura PHP 5 API Client Library" and "JQuery Library".
* Rights of the Kaltura PHP 5 API Client Library is reserved by the Kaltura Inc. (https://corp.kaltura.com/).
* Rigtts of the JQuery Library is reserved by JS Foundation (https://js.foundation/) and other cotributors.
* Rest parts of this software is reserved by "Tomoya Saito".

Warning
------

* I am not responsible for any problem caused by this software. 
* "Kaltura" is the registered trademark of the Kaltura Inc.
* Web-camera recording function supports the Mozilla Firefox, Google chrome and Opera.
* Now, this software does not support CORS (Cross-Origin Resource Sharing).

Release notes
------
* Version 1.0.0 (Dec. 14th, 2017). Release first version.
