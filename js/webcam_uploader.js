/**
 * Webcam recording and uploading script.
 * @copyright  2017-2019 Tomoya Saito
 * @license    http://www.gnu.org/licenses/agpl.html GNU AGPL v3 or later
 */

var modalX = 0;
var modalY = 0;

var fileSize = 0;
var sizeResult = false;
var fileType = "";
var videoFilename = "";

var backUrl = "";

var defaultWidth = 400;
var defaultHeight = 300;

var CHUNK_SIZE = 1024 * 1000 * 5;

var localStream = null;
var videoBlob = null;
var blobUrl = null;
var recorder = null;
var constraints = null;

var serverHost= "";

var uploadFlag = true;

var createObjectURL = window.URL && window.URL.createObjectURL
    ? function(file) { 
        return window.URL.createObjectURL(file);
    }
    : window.webkitURL && window.webkitURL.createObjectURL
    ? function(file) {
        return window.webkitURL.createObjectURL(file);
    }
    : undefined;

 var revokeObjectURL = window.URL && window.URL.revokeObjectURL
    ? function(file) {
        return window.URL.revokeObjectURL(file);
    }
    : window.webkitURL && window.webkitURL.revokeObjectURL
    ? function(file) {
        return window.webkitURL.revokeObjectURL(file);
    }
    : undefined;

var MEDIA_TYPE = {
    VIDEO: 1,
    IMAGE: 2,
    AUDIO: 5
};

var AUTO_FINALIZE = {
    TRUE: 1,
    FALSE: 0,
    NULL: -1
};

var ENTRY_STATUS = {
    ENTRY_IMPORTING: -2,
    ENTRY_CONVERTING: -1,
    ENTRY_IMPORT: 0,
    ENTRY_PRECONVERT: 1,
    ENTRY_READY: 2,
    ENTRY_DELETED: 3,
    ENTRY_PENDING: 4,
    ENTRY_MODERATE: 5,
    ENTRY_BLOCKED: 6,
    ENTRY_NO_CONTENT: 7
};

var UPLOAD_TOKEN_STATUS = {
    PENDING: 0,
    PARTIAL_UPLOAD: 1,
    FULL_UPLOAD: 2,
    CLOSED: 3,
    TIMED_OUT: 4,
    DELETED: 5
};

/**
 * This function retrieve whether web browser is the Internet Explorer.
 * @access public
 * @return {bool} - true if web browser is the IE, otherwise false.
 */
function isIE() {
    var ua = navigator.userAgent.toLowerCase();
    var ver = navigator.appVersion.toLowerCase();

    // Case of IE(not 11).
    var isMsIE = (ua.indexOf('msie') > -1) && (ua.indexOf('opera') == -1);
    // Case of IE6.
    var isIE6 = isMsIE && (ver.indexOf('msie 6.') > -1);
    // Case of IE7.
    var isIE7 = isMsIE && (ver.indexOf('msie 7.') > -1);
    // Case of IE8.
    var isIE8 = isMsIE && (ver.indexOf('msie 8.') > -1);
    // Case of IE9.
    var isIE9 = isMsIE && (ver.indexOf('msie 9.') > -1);
    // Case of IE10.
    var isIE10 = isMsIE && (ver.indexOf('msie 10.') > -1);
    // Case of IE11.
    var isIE11 = (ua.indexOf('trident/7') > -1);

    return isMsIE || isIE6 || isIE7 || isIE8 || isIE9 || isIE10 || isIE11;
}

/**
 * This function retrieve whether we browser is the Edge.
 * @access public
 * @return {bool} - true if web browser is the Edge, otherwise false.
 */
function isEdge() {
    var ua = navigator.userAgent.toLowerCase();

    // Case of Edge.
    var isMsEdge = (ua.indexOf('edge') > -1);
    // Case of Google Chrome.
    var isChrome = (ua.indexOf('chrome') > -1) && (ua.indexOf('edge') == -1);
    // Case of Moziila Firefox.
    var isFirefox = (ua.indexOf('firefox') > -1);
    // Case of Safari.
    var isSafari = (ua.indexOf('safari') > -1) && (ua.indexOf('chrome') == -1);
    // Case of Opera.
    var isOpera = (ua.indexOf('opera') > -1);

    return isMsEdge === true && isChrome === false && isFirefox === false && isSafari === false && isOpera === false;
}

/**
 * This function retrieve whether web browser is unsupported.
 * @access public
 * @return {bool} - true if web browser is unsupported, otherwise false.
 */
function checkUnsupportedBrowser() {
    if (isIE() || isEdge()) {
        var browser = "";
        if (isIE()) {
            browser = "Internet Explorer";
        } else {
            browser = "Edge";
        }

        printInitialErrorMessage("Sorry!!<br>This uploader does not support your browser.<br>Please use other browser.");
        return true;
    }
    return false;
}

/**
  * This function retrieve os type.
  * @return {string} - os type.
  */
function getOperatingSystem() {
    var os;
    var ua = navigator.userAgent;

    if (ua.match(/iPhone|iPad|iPod/)) {
        os = "iOS";
    } else if (ua.match(/Android|android/)) {
        os = "Android";
    } else if (ua.match(/Linux|linux/)) {
        os = "Linux";
    } else if (ua.match(/Win(dows)/)) {
        os = "Windows";
    } else if (ua.match(/Mac|PPC/)) {
        os = "Mac OS";
    } else if (ua.match(/CrOS/)) {
        os = "Chrome OS";
    } else {
        os = "Other";
    }

    return os;
}

/**
 * This function retrieve whether os is unsupported.
 * @access public
 * @return {bool} - true if os is unsupported, otherwise false.
 */
function checkUnsupportedOS() {
    var os = getOperatingSystem();

    if (os == "iOS" || os == "Android") {
        printInitialErrorMessage("Sorry!!<br>This uploader does not support your OS (" + os + ").<br>For iOS and Android, you can take a video/picture and can upload it through a file uploader." );
        return true;
    }
    return false;
}

/**
 * This function checks scheme of URL.
 * @return {bool} - If scheme is https, returns true. Otherwise, returns false.
 */
function isHttps() {
    var str = window.location.protocol;
    if (str.indexOf('https') != -1) {
        return true;
    }
    return false;
}

/**
 * This function print initial error message.
 * @access public
 * @param {string} errorMessage - error message.
 */
function printInitialErrorMessage(errorMessage) {
    var str = "";
    str = "<p><font color=\"red\">" + errorMessage + "</font></p>";
    $("#uploader_content").html(str);
}

/**

 * @access public
 * @param {string} url - url of media.
 */
function setPlayingPlayer(url) {
    var str = "<video id=\"webcam\" width=\"" + defaultWidth + "\" height=\"" + defaultHeight + "\" ";
    str = str + "src=\"" + url + "\" autoplay=\"false\" oncontextmenu=\"return false;\" controls></video>";
    $("#videospan").html(str);
    document.getElementById("webcam").pause();
    document.getElementById("webcam").currentTime = 0;
}

/**
 * This function print a video player for preview.
 * @access public
 * @param {string} url - url of media.
 */
function setPreviewPlayer(url) {
    var str = "<video id=\"webcam\" width=\"" + defaultWidth + "\" height=\"" + defaultHeight + "\" ";
    str = str + "autoplay=\"0\" muted oncontextmenu=\"return false;\"></video>";
    $("#videospan").html(str);
    $("#webcam").attr("src", url);
}

/**
 * This function start video recording by webcamera.
 * @access public
 */
function startRecording() {
    $("#recstop").attr("src", $("#stopurl").val());
    $("#recstop").off("click");

    $("#recstop").on("click", function() {
        stopRecording();
    });

    $("#leftspan").css("display", "inline");
    $("#webcam").volume = 0.0;
    recorder.start();

    $("#status").html("<font color=\"red\">Now, recording...</font>");
}

/**
 * This function stop video recording.
 * @access public
 */
function stopRecording() {
    recorder.ondataavailable = function(evt) {
        videoBlob = new Blob([evt.data], {type: evt.data.type});
        if (window.URL && window.URL.createObjectURL) {
            blobUrl = window.URL.createObjectURL(videoBlob);
        } else {
            blobUrl = window.webkitURL.createObjectURL(videoBlob);
        }
        setPlayingPlayer(blobUrl);
        fileSize = videoBlob.size;
        var sizeStr = "";
        var dividedSize = 0;

        if (fileSize > 1024 * 1024 * 1024) { // When file size exceeds 1GB.
            fileSize = fileSize / (1024 * 1024 * 1024);
            sizeStr = fileSize.toFixed(2) + " G";
        } else if (fileSize > 1024 * 1024) { // When file size exceeds 1MB.
            fileSize = fileSize / (1024 * 1024);
            sizeStr = fileSize.toFixed(2) + " M";
        } else if (fileSize > 1024) { // When file size exceeds 1kB.
            fileSize = fileSize / 1024;
            sizeStr = fileSize.toFixed(2) + " k";
        } else { // When file size under 1kB.
            sizeStr = fileSize + " ";
        }

        $("#status").html("<font color=\"green\">Video preview (" + videoBlob.type + ", " + sizeStr + "B).</font>");
        fileType = checkFileType(videoBlob.type);

        $("#type").val(fileType);

        sizeResult = checkFileSize();
        if (sizeResult === false) {
            window.alert("Wrong file size.");
        }
        checkForm();

        videoFilename = $("#filename").val() + "." + getFileExtension(videoBlob.type);
    };


    if (localStream.getTracks !== undefined && localStream.getTracks !== null) {
        var tracks = localStream.getTracks();
        for (var i = tracks.length - 1; i >= 0; --i) {
            tracks[i].stop();
        }
        if (document.getElementById("webcam").srcObject !== undefined) {
            document.getElementById("webcam").srcObject = null;
        }
    }

    recorder.stop();

    $("#leftspan").css("display", "none");
    $("#rightspan").css("display", "inline");

    $("#remove").on("click", function() {
        removeVideo();
    });
}

/**
 * This function stop video recording.
 * @access public
 */
function removeVideo() {

    if (!isHttps()) {
        printInitialErrorMessage("Sorry!!<br>This uloader works with HTTPS protocol, and does not works with other protocols.<br>Please use HTTPS for your web site.");
        return;
    }

    // Print error message and return true if web browser is unsupported.
    if (checkUnsupportedBrowser() || checkUnsupportedOS()) {
        return;
    }

    var str = "";

    navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
        getUserMedia: function(c) {
            return new Promise(function(y, n) {
                (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
            });
        }
    } : null);

    try {
        if (navigator.mediaDevices === null || navigator.mediaDevices === undefined ||
            MediaRecorder === null || MediaRecorder === undefined) {
            printInitialErrorMessage("This uploader requires the WebRTC.<br>Howerver, your web browser does not support (or does not enable) the WebRTC.");
            return;
        }

        if (createObjectURL === null || createObjectURL === undefined ||
            revokeObjectURL === null || revokeObjectURL === undefined) {
            printInitialErrorMessage("This uploader requires the createObjectURL/revokeObjectURL.<br>Howerver, your web browser does not support these function.");
            return;
        }
    } catch(err) {
        printInitialErrorMessage("This uploader requires the WebRTC.<br>Howerver, your web browser does not support (or does not enable) the WebRTC.");
        return;
    }

    setPreviewPlayer(null);

    if (blobUrl !== null) {
        if (window.URL && window.URL.revokeObjectURL) {
            window.URL.revokeObjectURL(blobUrl);
        } else {
            window.webkitURL.revokeObjectURL(blobUrl);
        }
        blobUrl = null;
        videoBlob = null;
    }

    if (localStream !== null) {
        if (localStream.getTracks !== undefined || localStream.getTracks !== null) {
            var tracks = localStream.getTracks();
            for (var i = tracks.length - 1; i >= 0; --i) {
                tracks[i].stop();
            }
            if (document.getElementById("webcam").srcObject) {
                document.getElementById("webcam").srcObject = null;
            }
        } else {
            localStream.stop();
        }
    }

    fileSize = 0;
    sizeResult = false;
    fileType = "";

    $("#recstop").off("click");
    $("#remove").off("click");
    $("#webcam").off("ondataavailable");

    var mimeOption = "";

    var WebcamRecorder = MediaSource || MediaRecorder;

    // Prefer camera resolution nearest to 1280x720.
    if (WebcamRecorder.isTypeSupported("video/webm")) {
        mimeOption = "video/webm";
    } else if (WebcamRecorder.isTypeSupported("video/mp4")) {
        mimeOption = "video/mp4";
    } else if (WebcamRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
        mimeOption = "video/webm; codecs=vp8, ";
    } else if (WebcamRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        mimeOption = "video/webm; codecs=vp9, ";
    } else if (WebcamRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeOption = "video/webm; codecs=vp8";
    } else {
        mimeOption = "video/webm; codecs=vp9";
    }

    constraints = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 1500000,
        mimeType: mimeOption,
        audio: {
            echoCancellation: false
        },
        video: {
            "mandatory": {
                minWidth: 320,
                minHeight: 240,
                maxWidth: 1280,
                maxHeight: 720,
                minFrameRate: 5,
                maxFrameRate: 15
            },
            "optional": [{"facingMode": "user"}]
        }
    };

    var p = navigator.mediaDevices.getUserMedia(constraints);

    p.then(function(stream) {
        localStream = stream;
        var video = document.getElementById("webcam");
        if (video.srcObject !== undefined) {
            video.srcObject = localStream;
            video.play();
        } else {
            if (window.URL && window.URL.createObjectURL) {
                blobUrl = window.URL.createObjectURL(blobUrl);
            } else {
                blobUrl = window.webkitURL.createObjectURL(blobUrl);
            }
            $("#webcam").attr("src", blobUrl);
        }

        if (MediaSource !== null || MediaSource !== undefined) {
            recorder = new MediaRecorder(localStream);
        } else {
            recorder = new MediaRecorder(localStream, constraints);
        }

        $("#recstop").attr("src", $("#recurl").val());
        $("#recstop").on("click", function() {
            startRecording(localStream);
        });
        $("#leftspan").css("display", "inline");
        $("#rightspan").css("display", "none");

        $("#status").html("Camera perview...");

        return 0;
    })
    .catch(function(err) {
        printInitialErrorMessage("Sorry!!<br>This uploader does not support your camera.<br>Or, other program uses your camera.");
        window.console.log(err);
        return;
    });

    checkForm();
}

/**
 * This function centerizes a modal window.
 * @access public
 */
function centeringModalSyncer() {

    // Get width and height of window.
    var w = $(window).width();
    var h = $(window).height();

    // Get width and height of modal_content.
    var cw = $("#modal_content").outerWidth();
    var ch = $("#modal_content").outerHeight();

    // Execute centerize.
    $("#modal_content").css({"left": ((w - cw) / 2) + "px", "top": ((h - ch) / 2) + "px"});
}

/**
 * This function checks file size.
 * @access public
 * @return {bool} - The file can upload?
 */
function checkFileSize() {
    if (videoBlob === null) {
        return false;
    }
    if (videoBlob.size <= 0 || videoBlob.size >  2000000000) {
        return false;
    }

    return true;
}

/**
 * This function checks file type.
 * @access public
 * @param {string} fileType - file type of selected media.
 * @return {string} - media type string for kaltura server.
 */
function checkFileType(fileType) {
    if (fileType.indexOf("video/avi") != -1 || fileType.indexOf("video/x-msvideo") != -1 ||
        fileType.indexOf("video/mpeg") != -1 || fileType.indexOf("video/mpg") != -1 ||
        fileType.indexOf("video/mp4") != -1 || fileType.indexOf("video/ogg") ||
        fileType.indexOf("video/quicktime") != -1 || fileType.indexOf("video/VP8") != -1 ||
        fileType.indexOf("video/x-flv") != -1 || fileType.indexOf("video/x-f4v") != -1 ||
        fileType.indexOf("video/x-matroska") != -1 ||
        fileType.indexOf("video/x-ms-wmv") != -1 || fileType.indexOf("video/webm") != -1) {
        return "video";
    }

    if (fileType.indexOf("audio/ac3") != -1 || fileType.indexOf("audio/ogg") != -1 ||
        fileType.indexOf("audio/mpeg") != -1  || fileType.indexOf("audio/mp4") != -1 ||
        fileType.indexOf("audio/wav") != -1 || fileType.indexOf("audio/x-ms-wma") != -1) {
        return "audio";
    }

    if (fileType.indexOf("image/gif") != -1 || fileType.indexOf("image/jpeg") != -1 ||
        fileType.indexOf("image/png") != -1 || fileType.indexOf("image/tiff") != -1) {
        return "image";
    }

    return "N/A";
}

/**
 * This function return file extension string.
 * @access public
 * @param {string} fileType - file type of selected media.
 * @return {string} - file extension of selected media.
 */
function getFileExtension(fileType) {
    if (fileType.indexOf("video/avi") != -1 || fileType.indexOf("video/x-msvideo") != -1) {
        return "avi";
    }
    if (fileType.indexOf("video/mpeg") != -1 || fileType.indexOf("video/mpg") != -1 ||
        fileType.indexOf("audio/mpeg") != -1 || fileType.indexOf("audio/mpg") != -1) {
        return "mpeg";
    }
    if (fileType.indexOf("video/mp4") != -1 || fileType.indexOf("video/m4v") != -1 ||
        fileType.indexOf("audio/mp4") != -1) {
        return "mp4";
    }
    if (fileType.indexOf("video/ogg") != -1) {
        return "ogg";
    }
    if (fileType.indexOf("video/quicktime") != -1) {
        return "mov";
    }
    if (fileType.indexOf("video/VP8") != -1 || fileType.indexOf("video/VP9") != -1 ||
        fileType.indexOf("video/vp8") != -1 || fileType.indexOf("video/vp9") != -1 ||
        fileType.indexOf("video/webm") != -1) {
        return "webm";
    }
    if (fileType.indexOf("video/x-flv") != -1 || fileType.indexOf("video/x-f4v") != -1) {
        return "flv";
    }
    if (fileType.indexOf("video/x-matroska") != -1) {
        return "mkv";
    }
    if (fileType.indexOf("video/x-ms-wmv") != -1) {
        return "wmv";
    }

    if (fileType.indexOf("audio/ac3") != -1) {
        return "ac3";
    }
    if (fileType.indexOf("audio/ogg") != -1) {
        return "ogg";
    }
    if (fileType.indexOf("audio/wav") != -1) {
        return "wav";
    }
    if (fileType.indexOf("audio/x-ms-wma") != -1) {
        return "wma";
    }

    if (fileType.indexOf("image/gif") != -1) {
        return "gif";
    }
    if (fileType.indexOf("image/jpeg") != -1) {
        return "jpg";
    }
    if (fileType.indexOf("image/png") != -1) {
        return "png";
    }
    if (fileType.indexOf("image/tiff") != -1) {
        return "tiff";
    }

    return "webm";
}

/**
 * This function checks metadata.
 * @access public
 */
function checkForm() {
    if (blobUrl === null ||
        videoBlob === null ||
        videoBlob.size === 0 ||
        sizeResult === false ||
        $("#name").val() === "" ||
        $("#tags").val() === "" ||
        fileType === "" ||
        fileType === "N/A") {
        // Dsiable upload button.
        $("#entry_submit").prop("disabled", true);
    } else {
        // Enable upload button.
        $("#entry_submit").prop("disabled", false);
    }
}

/**
 * This function is callback for cancel button.
 * @access public
 */
function handleCancelClick() {
    sessionEnd();
    location.href = backUrl;
}

/**
 * This function prints modal window.
 * @access public
 * @return {boole} - If modal window open, return true. Otherwise, return false.
 */
function fadeInModalWindow() {
    // Window Unfocus for avoid duplication.
    $(this).blur();
    if ($("#modal_window")[0]) {
        return false;
    }

    // Records scroll position of window.
    var dElm = document.documentElement;
    var dBody = document.body;
    modalX = dElm.scrollLeft || dBody.scrollLeft; // X position.
    modalY = dElm.scrollTop || dBody.scrollTop; // Y position.
    // Print overlay.
    $("body").append("<div id=\"modal_window\"></div>");
    $("#modal_window").fadeIn("slow");

    // Execure centerrize.
    centeringModalSyncer();
    // Fade-in modal window.
    $("#modal_content").fadeIn("slow");

    return true;
}

/**
 * This function deletes a modal window.
 * @access public
 */
function fadeOutModalWindow() {
    // Rescore scroll position of window.
    window.scrollTo(modalX, modalY);
    // Fade-out [#modal_content] and [#modal_window].
    $("#modal_content,#modal_window").fadeOut("slow", function() {
        // Delete [#modal_window].
        $("#modal_window").remove();
        $("#modal_content").remove();
    });
}

/**
 * This function adds back button.
 * @access public
 */
function addBackButton() {
    var contentHtml = "<br><input type=button id=\"backToMymedia\" name=\"backToMymedia\" value=\"Back\" />";
    $("#modal_content").append(contentHtml);

    $("#backToMymedia").on("click", function() {
        handleCancelClick();
    });

}

/**
 * This function prints error message.
 * @access public
 * @param {string} errorMessage - string of error message.
 * @param {string} ks - kaltura session string.
 * @param {string} uploadTokenId - upload token id,
 */
function printErrorMessage(errorMessage, ks, uploadTokenId) {
    if (uploadTokenId !== null && uploadTokenId !== '') {
        deleteUploadToken(ks, uploadTokenId);
    }
    $("#modal_content").append("<font color=\"red\">" + errorMessage + "</font><br>");
    addBackButton();
}

/**
 * This function prints success message.
 * @access public
 * @param {string} id - id of media entry.
 * @param {string} name - name of media entry.
 * @param {string} tags - tags of media entry.
 * @param {string} description - description of media entry.
 * @param {string} creatorId - username of creator.
 */
function printSuccessMessage(id, name, tags, description, creatorId) {
    // Delete modal window.
    fadeOutModalWindow();

    var output = "<h3>Your upload has been suceeded !</h3>";

    output += "<table border=\"2\" cellpadding=\"5\">";
    output += "<tr><td>entry id</td><td>" + id + "</td></tr>";
    output += "<tr><td>name</td><td>" + name + "</td></tr>";
    output += "<tr><td>tags</td><td>" + tags + "</td></tr>";
    output += "<tr><td>description</td><td>" + description + "</td></tr>";
    output += "<tr><td>creator id</td><td>" + creatorId + "</td></tr>";
    output += "</table>";
    output += "<br>";
    output += "<input type=button id=\"backToMymedia\" name=\"backToMymedia\" value=\"Back\" />";

    $("#upload_info").html(output);

    $("#backToMymedia").on("click", function() {
        handleCancelClick();
    });
}

/**
 * This function is callback for reset button.
 * @access public
 */
function handleResetClick() {
    $("#file_info").html("");
    $("#type").val("");
}

/**
 * This function checks name of media.
 * @access public
 * @param {string} str - name of media.
 * @return {bool} - if name is appropriate, return "true". Otherwise, return "false".
 */
function checkNameString(str) {
    var regex = /["$%&'~\^\\`\/]/;
    if (regex.test(str) === true) {
        return false;
    } else {
        return true;
    }
}

/**
 * This function checks tags of media.
 * @access public
 * @param {string} str - tagas of media.
 * @return {bool} - if tags are appropriate, return "true". Otherwise, return "false".
 */
function checkTagsString(str) {
    var regex = /[!"#$%&'~\|\^\\@`()\[\]\{\}:;\+\*\/=<>?]/;
    if (regex.test(str) === true) {
        return false;
    } else {
        return true;
    }
}

/**
 * This function checks metadata of media.
 * @access public
 * @return {bool} - if metadata is appropriate, return "true". Otherwise, return "false".
 */
function checkMetadata() {
    var nameStr = $("#name").val();
    var tagsStr = $("#tags").val();
    var descStr = $("#description").val();

    if (checkNameString(nameStr) === false) {
        window.alert("There is wrong letter(s) in <Name>.");
        return false;
    }

    if (checkTagsString(tagsStr) === false) {
        window.alert("There is wrong letter(s) in <Tags>.");
        return false;
    }

    if (checkNameString(descStr) === false) {
        window.alert("There is wrong letter(s) in <Description>.");
        return false;
    }

    return true;
}

/**
 * This function is callback for submit button.
 * @access public
 * @return {bool} - if file is uploaded, return true. Otherwise, return false.
 */
function handleSubmitClick() {

    if (checkMetadata() === false) {
        window.alert("Wrong metadata.");
        return false;
    }
    if (checkFileSize() === false) {
        window.alert("Wrong file size.");
        return false;
    }

    fadeInModalWindow(); // Prints modal window.
    executeUploadProcess(); // Executes upload.

    return true;
}

/**
 * This function executes upload process.
 * @access public
 */
function executeUploadProcess() {
    var ks = $("#ks").val(); // Get session id.
    // Uploadgin media file.
    createUploadToken(ks);
}

/**
 * This function deletes upload token.
 * @access public
 * @param {string} ks - session string of kaltura connection.
 * @param {string} uploadTokenId - token id for uploading.
 * @return {bool} if upload token is deleted, return true.
 */
function deleteUploadToken(ks, uploadTokenId) {
    var fd = new FormData();
    var flag;

    // Set form data.
    fd.append("action", "delete");
    fd.append("ks", ks);
    fd.append("uploadTokenId", uploadTokenId);

    // Set transmission data.
    var postData = {
        type: "POST",
        xhrFields: {withCredentials: false},
        crossDomain: true,
        data: fd,
        cache: false,
        contentType: false,
        scriptCharset: "utf-8",
        processData: false,
        async: true,
        dataType: "xml"
    };

    var serviceURL = serverHost + "/api_v3/service/uploadToken/action/delete";

    // Transmits a data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData) {
        // When response is not XML.
        if (xmlData === null) {
            flag = false;
        }
        flag = true;
    })
    .fail(function(xmlData) {
        flag = false;
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
    });

    return flag;
}

/**
 * This function creates upload token.
 * @access public
 * @param {string} ks - session string of kaltura connection.
 */
function createUploadToken(ks) {
    var uploadTokenId;
    var findData;

    var fd = new FormData();

    var postData = {
        type: "GET",
        xhrFields: {withCredentials: false},
        crossDomain: true,
        cache: false,
        async: false,
        contentType: false,
        scriptCharset: "utf-8",
        dataType: "xml"
    };

    var serviceURL = serverHost + "/api_v3/service/uploadToken/action/add?ks=" + ks;
    serviceURL = serviceURL + "&uploadToken:objectType=KalturaUploadToken&uploadToken:fileName=" + encodeURI(videoFilename);
    serviceURL = serviceURL + "&uploadToken:fileSize=" + videoBlob.size + "&uploadToken:autoFinalize=" + AUTO_FINALIZE.NULL;

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData) {
        // Response is not XML.
        if (xmlData === null) {
            printErrorMessage("Cannot create upload token !<br>(Cannot get a XML response.)", ks, uploadTokenId);
            return;
        }

        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            printErrorMessage("Cannot create upload token !<br>(" + findData.text() + ")", ks, uploadTokenId);
            return;
        }

        findData = $(xmlData).find("status");
        // There not exists upload token id.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot create upload token !<br>(Cannot get status of upload token.)",
                ks, uploadTokenId);
            return;
        }

        var uploadTokenStatus = findData.text();
        if (uploadTokenStatus != UPLOAD_TOKEN_STATUS.PENDING) {
            printErrorMessage("Cannot create upload token !<br>(UPLOAD_TOKEN_STATUS : " + uploadTokenStatus + ")",
                              ks, uploadTokenId);
            return;
        }

        // Get upload token id.
        findData = $(xmlData).find("id");
        // There not exists upload token id.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot create uplaod token !<br>(Cannot get an uploadTokenId.)", ks, uploadTokenId);
            return;
        }
        uploadTokenId = findData.text();
        // Entry metadata.
        setTimeout(function() {
            createMediaEntry(ks, uploadTokenId);
        }, 1000);

     })
    .fail(function(xmlData) {
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot create upload token !<br>(Cannot connect to video server.)", ks, uploadTokenId);
    });
}

/**
 * This function creates media entry.
 * @access public
 * @@aram {string} ks - session string of kaltura connecion;
 * @param {string} uploadTokenId - upload token id.
 */
function createMediaEntry(ks, uploadTokenId) {
    var findData;
    var entryStatus;
    var entryId = "";
    var entryName = "";
    var entryTags = "";
    var entryDescription = "";
    var entryCreatorId = "";

    var nameStr = $("#name").val();
    var tagsStr = $("#tags").val();
    var descStr = $("#description").val();
    var controlId = $("#controlId").val();

    nameStr = nameStr.trim();
    tagsStr = tagsStr.trim();
    if (descStr !== null) {
        descStr = descStr.trim();
    }

    var fd = new FormData();

    // Creates form data.
    fd.append("action", "add");
    fd.append("ks", ks);
    fd.append("entry:objectType", "KalturaMediaEntry");
    fd.append("entry:mediaType", MEDIA_TYPE.VIDEO);
    fd.append("entry:sourceType", 1);
    fd.append("entry:name", nameStr);
    fd.append("entry:tags", tagsStr);
    if (descStr !== null && descStr !== "") {
        fd.append("entry:description", descStr);
    } else {
        fd.append("entry:description", "");
    }

    fd.append("entry:categories", $("#categories").val());

    if (controlId !== null && controlId !== "") {
        fd.append("entry:accessControlId", controlId);
    }

    // Creates transmission data.
    var postData = {
        type: "POST",
        xhrFields: {withCredentials: false},
        crossDomain: true,
        data: fd,
        cache: false,
        async: false,
        contentType: false,
        scriptCharset: "utf-8",
        processData: false,
        dataType: "xml"
    };

    var serviceURL = serverHost + "/api_v3/service/media/action/add";

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData) {
        // Response is not XML.
        if (xmlData === null || typeof xmlData === undefined) {
            printErrorMessage("Cannot create media entry !<br>(Cannot get a XML response.)", ks, uploadTokenId);
            return;
        }

        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists an error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            printErrorMessage("Cannot create media entry !<br>(" + findData.text() + ")", ks, uploadTokenId);
            return;
        }

        // Get a tag of status.
        findData = $(xmlData).find("status");
        // There not exists a tag of status.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot create media entyry !<br>(Cannot get a mediaEntryStatus.)", ks, uploadTokenId);
            return;
        }

        // Get a value of status.
        entryStatus = findData.text();
        // When uploading of metadata failed.
        if (entryStatus != ENTRY_STATUS.ENTRY_NO_CONTENT) {
            printErrorMessage("Cannot create media entry!<br>(mediaEntryStatus: " + entryStatus + ")",
                ks, uploadTokenId);
            return;
        }

        // Get a tag of entry id.
        findData = $(xmlData).find("id");
        // Get a value of entry id.
        entryId = findData.text();
        // Get a tag of name.
        findData = $(xmlData).find("name");
        // Get a value of name.
        entryName = findData.text();
        // Get a tag of tags.
        findData = $(xmlData).find("tags");
        // Get a value of tags.
        entryTags = findData.text();
        // Get a tag of description.
        findData = $(xmlData).find("description");
        // There exists description.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            // Get a value of description.
            entryDescription = findData.text();
        } else {
            entryDescription = "";
        }
        // Get a tago of creator id.
        findData = $(xmlData).find("creatorId");
        // Get a value of creator id.
        entryCreatorId = findData.text();

        // Associate uploaded file with media entry
        setTimeout(function() {
           uploadMediaFile(ks, uploadTokenId, entryId);
        }, 1000);
        
    })
    .fail(function(xmlData) {
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot create media entry !<br>(Cannot connect to contents server.)", ks, uploadTokenId);
        return;
    });
}

/**
 * This function uploads media file.
 * @access public
 * @param {string} ks - session string of kaltura connection.
 * @param {string} uploadTokenId - upload token id.
 * @param {string} entryId - id of media entry.
 */
function uploadMediaFile(ks, uploadTokenId, entryId) {
    var findData;

    var fd = new FormData();
    var flag = true;

    $("#modal_content").append("Uploading a recorded video ...");
    $("#modal_content").append("<p>Progress: <span id=\"pvalue\" style=\"color:#00b200\">0.00</span> %</p>");

    // Creates form data.
    fd.append("action", "upload");
    fd.append("ks", ks);
    fd.append("uploadTokenId", uploadTokenId);
    fd.append("fileData", videoBlob, encodeURI(videoFilename), videoBlob.size);
    fd.append("resume", false);
    fd.append("finalChunk", true);
    fd.append("resumeAt", 0);

    // Creates tnramission data.
    var postData = {
        type: "POST",
        data: fd,
        cache: false,
        async: true,
        contentType: false,
        scriptCharset: "utf-8",
        processData: false,
        dataType: "xml",
        xhr: function() {
            var XHR = $.ajaxSettings.xhr();
            if (XHR.upload) {
                XHR.upload.addEventListener("progress", function(e) {
                    var newValue = parseInt(e.loaded / e.total * 10000) / 100;
                    $("#pvalue").html(parseInt(newValue));
                }, false);
            }
            return XHR;
        }
    };

    var serviceURL = serverHost + "/api_v3/service/uploadToken/action/upload";

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData, textStatus, xhr) {
        // Response is not XML.
        if (xmlData === null) {
            printErrorMessage("Cannot upload the video !<br>(Cannot get a XML response.)", ks, uploadTokenId);
            return;
        }

        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            printErrorMessage("Cannot upload the video !<br>(" + findData.text() + ")", ks, uploadTokenId);
            return;
        }

        // Get upload token id.
        findData = $(xmlData).find("status");
        // There not exists upload token id.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot upload the video !<br>(Cannot get an uploadTokenStatus.)", ks, uploadTokenId);
            return;
        }

        var uploadTokenStatus = findData.text();
        if (uploadTokenStatus != UPLOAD_TOKEN_STATUS.FULL_UPLOAD &&
            uploadTokenStatus != UPLOAD_TOKEN_STATUS.PARTIAL_UPLOAD) {
            printErrorMessage("Cannot upload the video !<br>(UPLOAD_TOKEN_STATUS : " + uploadTokenStatus + ")",
                              ks, uploadTokenId);
            return;
        }
        else {
            window.console.log("Ffile chunk have been transmitted.");
        }
        $("#modal_content").append("Attach uploaded file ...<br>");
        // Create media entry.
        setTimeout(function() {
            attachUploadedFile(ks, uploadTokenId, entryId);
        }, 1000);

    })
    .fail(function(xmlData) {
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot upload the file !<br>(Cannot connect to contents server.)", ks, uploadTokenId);
        flag = false;
    });
}

/**
 * This function associate uploaded file with media entry.
 * @access public
 * @param {string} ks - session string of kaltura connection.
 * @param {string} uploadTokenId - upload token id.
 * @param {string} entryId - id of media entry.
 */
function attachUploadedFile(ks, uploadTokenId, entryId) {
    var entryStatus;
    var entryName = "";
    var entryTags = "";
    var entryDescription = "";
    var entryCreatorId = "";

    var findData;

    // Creates form data.
    var fd = new FormData();
    fd.append("action", "addContent");
    fd.append("ks", ks);
    fd.append("entryId", entryId);
    fd.append("resource:objectType", "KalturaUploadedFileTokenResource");
    fd.append("resource:token", uploadTokenId);

    // Creates transmission data.
    var postData = {
        type: "POST",
        xhrFields: {withCredentials: false},
        crossDomain: true,
        data: fd,
        cache: false,
        async: false,
        contentType: false,
        scriptCharset: "utf-8",
        processData: false,
        dataType: "xml"
    };

    var serviceURL = serverHost + "/api_v3/service/media/action/addContent";

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData) {
        // Response is not XML.
        if (xmlData === null || typeof xmlData === undefined) {
            printErrorMessage("Cannot attach uploaded file !<br>(Cannot get a XML response.)", ks, uploadTokenId);
            return;
        }

        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            printErrorMessage("Cannot attach uploaded file !<br>(" + findData.text() + ")", ks, uploadTokenId);
            return;
        }

        // Get a tag of status.
        findData = $(xmlData).find("status");
        // There not exists a tag of status.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot attach uploaded file !<br>(Cannot get a mediaEntryStatus.)", ks, uploadTokenId);
            return;
        }

        // Get a value of status.
        entryStatus = findData.text();
        // When uploading of metadata failed.
        if (entryStatus != ENTRY_STATUS.ENTRY_READY && entryStatus != ENTRY_STATUS.ENTRY_PENDING &&
            entryStatus != ENTRY_STATUS.ENTRY_PRECONVERT && entryStatus != ENTRY_STATUS.IMPORT &&
            entryStatus != ENTRY_STATUS.IMPORTING) {
            printErrorMessage("Cannot attach uploaded file !<br>(mediaEntryStatus: " + entryStatus + ")",
                ks, uploadTokenId);
            return;
        }

        // Get a tag of entry id.
        findData = $(xmlData).find("id");
        // Get a value of entry id.
        entryId = findData.text();
        // Get a tag of name.
        findData = $(xmlData).find("name");
        // Get a value of name.
        entryName = findData.text();
        // Get a tag of tags.
        findData = $(xmlData).find("tags");
        // Get a value of tags.
        entryTags = findData.text();
        // Get a tag of description.
        findData = $(xmlData).find("description");
        // There exists description.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            // Get a value of description.
            entryDescription = findData.text();
        } else {
            entryDescription = "";
        }
        // Get a tago of creator id.
        findData = $(xmlData).find("creatorId");
        // Get a value of creator id.
        entryCreatorId = findData.text();

        // Delete upload token id.
        //deleteUploadToken(ks, uploadTokenId);

        // Prints back button.
        addBackButton();
        // Prints success message.
        printSuccessMessage(entryId, entryName, entryTags, entryDescription, entryCreatorId);
    })
    .fail(function(xmlData) {
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot attach uploaded file !<br>(Cannot connect to contents server.)", ks, uploadTokenId);
        return;
    });
}

/**
 * This function close kaltura session.
 * @access public
 */
function sessionEnd() {
    var serviceURL = serverHost + "/api_v3/service/session/action/end";

    // Transmits data.
    $.ajax({
        type: "GET",
        crossDomain: true,
        xhrFields: {withCredentials: false},
        url: serviceURL,
        cache: false
    })
    .done(function(xmlData) {
        // Response is not XML.
        if (xmlData === null) {
            window.console.log("Cannot delete the uploadToken ! (Cannot get a XML response.)");
        } else {
            window.console.log("Kaltura Session has been deleted.");
        }
    })
    .fail(function(xmlData) {
        window.console.log("Cannot delete the uploadToken ! (Cannot connect to contents server.)");
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
    });
}

// This function execute when window is chagned.
$(window).on("change", function() {
    checkForm();
});

// This function execute when window is uloaded.
$(window).on("unload", function() {
    if (blobUrl !== null) {
        revokeObjectURL(blobUrl);
        videoBlob = null;
        blobUrl = null;
    }

    if (localStream !== null) {
        localStream.stop();
    }

    sessionEnd();
});

// This function execute when window is resized.
$(window).resize(centeringModalSyncer);

$(window).on("load", function() {
    backUrl = $("#backUrl").val();
    $("#name").val("");
    $("#tags").val("");
    $("#description").val("");
    removeVideo();

    serverHost = $("#kalturahost").val(); // Get hostname of kaltura server.

    $("#uploader_cancel").on("click", function() {
        handleCancelClick();
    });

    $("#name").on("change", function() {
        checkForm();
    });

    $("#tags").on("change", function() {
        checkForm();
    });

    $("#entry_submit").on("click", function() {
        handleSubmitClick();
    });

    $("#entry_reset").on("click", function() {
        handleResetClick();
    });
});

