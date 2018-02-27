/**
 * Webcam recording and uploading script.
 * @copyright  2017 Tomoya Saito
 * @license    http://www.gnu.org/licenses/agpl.html GNU AGPL v3 or later
 */

var modalX = 0;
var modalY = 0;

var fileSize = 0;
var sizeResult = false;
var fileType = "";

var backUrl = "";

var defaultWidth = 400;
var defaultHeight = 300;

var localStream = null;
var videoBlob = null;
var blobUrl = null;
var recorder = null;
var constraints = null;

var serverHost= "";

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

var STATUS = {
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

/**
 * This function print a video player for playing.
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
        blobUrl = createObjectURL(videoBlob);
        setPlayingPlayer(blobUrl);
        fileSize = videoBlob.size;
        var sizeStr = "";

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

    };
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
    var str = "";

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    try {
        if (navigator.getUserMedia === null || navigator.getUserMedia === undefined ||
            MediaRecorder === null || MediaRecorder === undefined) {
            str = "<font color=\"red\">This uploader requires the WebRTC.<br>";
            str = str + "Howerver, your web browser don't support the WebRTC.</font>";
            $("#message").html(str);
            return;
        }
    } catch(err) {
        str = "<font color=\"red\">This uploader requires the WebRTC.<br>";
        str = str + "Howerver, your web browser don't support the WebRTC.</font>";
        $("#message").html(str);
        return;
    }

    try {
        if (createObjectURL === null || createObjectURL === undefined ||
            revokeObjectURL === null || revokeObjectURL === undefined) {
            str = "<font color=\"red\">This uploader requires the createObjectURL/revokeObjectURL.<br>";
            str = str + "Howerver, your web browser don't support these function.</font>";
            $("#message").html(str);
            return;
        }
    } catch(err) {
        str = "<font color=\"red\">This uploader requires the WebRTC.<br>";
        str = str + "Howerver, your web browser don't support the WebRTC.</font>";
        $("#message").html(str);
        return;
    }

    if (blobUrl !== null) {
        revokeObjectURL(blobUrl);
        blobUrl = null;
        videoBlob = null;
    }

    if (localStream !== null && localStream.stop !== undefined) {
        localStream.stop();
    }

    fileSize = 0;
    sizeResult = false;
    fileType = "";

    $("#recstop").off("click");
    $("#remove").off("click");
    $("#webcam").off("ondataavailable");

    var mimeOption = "";

    // Prefer camera resolution nearest to 1280x720.
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeOption = "video/webm; codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeOption = "video/webm; codecs=vp8";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeOption = "video/webm";
    } else {
        mimeOption = "video/mp4";
    }

    constraints = {
        mimeType: mimeOption,
        audio: true,
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


    navigator.getUserMedia(constraints,
    function(stream) {
        localStream = stream;
        blobUrl = createObjectURL(localStream);
        $("#webcam").attr("src", blobUrl);
        window.console.log(localStream);
        recorder = new MediaRecorder(localStream, constraints);
        $("#recstop").attr("src", $("#recurl").val());
        $("#recstop").on("click", function() {
            startRecording();
        });
        $("#leftspan").css("display", "inline");
        $("#rightspan").css("display", "none");
        $("#status").html("Camera preview.");
        setPreviewPlayer(blobUrl);
    },
    function(err) {
        var str = "<font color=\"red\">Your webcamera is not supported, ";
        str = str + "or the webcamera is already used.</font>";
        $("#message").html(str);
        window.console.log(err.name + ": " + err.message);
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
    if (fileSize <= 0) {
        return false;
    }
    if (fileSize > 2000000000) {
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
        fileType.indexOf("audio/mpeg") != -1  || fileType.indexOf("audip/mp4") != -1 ||
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
 */
function printErrorMessage(errorMessage) {
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
    uploadMediaFile(ks);
}

/**
 * This function deletes upload token.
 * @access public
 * @param {string} serverHost - hostname of kaltura server.
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
 * This function uploads media file.
 * @access public
 * @param {string} serverHost - hostname of kaltura server.
 * @param {string} ks - session string of kaltura connection.
 */
function uploadMediaFile(ks) {
    var uploadTokenId;
    var findData;

    var fd = new FormData();

    // Creates form data.
    fd.append("action", "upload");
    fd.append("fileData", videoBlob);
    fd.append("ks", ks);

    // Creates transmission data.
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

    var serviceURL = serverHost + "/api_v3/service/media/action/upload";

    $("#modal_content").append("Uploading a media file ...<br>");

    $("#modal_content").append("<p>Progress: <span id=\"pvalue\" style=\"color:#00b200\">0.00</span> %</p>");

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData, textStatus, xhr) {
        // Response is not XML.
        if (xmlData === null) {
            deleteUploadToken(serverHost, ks, uploadTokenId);
            printErrorMessage("Cannot upload the file !<br>(Cannot get a XML response.)");
            return;
        }
        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            printErrorMessage("Cannot upload the file !<br>(" + findData.text() + ")");
            return;
        }

        // Get upload token id.
        findData = $(xmlData).find("result");
        // There not exists upload token id.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            printErrorMessage("Cannot upload the file !<br>(Cannot get an uploadTokenId.)");
            return;
        }
        // Get a value of upload token id.
        uploadTokenId = findData.text();

        $("#modal_content").append("Uploading an attirbute information ...<br>");

        var backendHost = xhr.getResponseHeader("X-Me");
        if (backendHost !== null && backendHost !== '') {
            if (serverHost.indexOf("https") === 0) {
                serverHost = "https://" + backendHost;
            } else if (serverHost.indexOf("http") === 0) {
                serverHost = "http://" + backendHost;
            }
        }

        // Entry metadata.
        setTimeout(function() {
            uploadAttributes(ks, uploadTokenId);
        }, 1000);
    })
    .fail(function(xmlData) {
        deleteUploadToken(ks, uploadTokenId);
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot upload the file !<br>(Cannot connect to contents server.)");

    });
}

/**
 * This function uploads metadata.
 * @access public
 * @param {string} serverHost - hostname of kaltura server.
 * @param {string} ks - session string of kaltura connection.
 * @param {string} uploadTokenId - upload token id.
 */
function uploadAttributes(ks, uploadTokenId) {

    var findData;
    var entryStatus;
    var entryId = "";
    var entryName = "";
    var entryTags = "";
    var entryDescription = "";
    var entryCreatorId = "";
    var type = $("#type").val();
    var mediaType = MEDIA_TYPE.VIDEO;

    if (type == "image") {
        mediaType = MEDIA_TYPE.IMAGE;
    } else if (type == "audio") {
        mediaType = MEDIA_TYPE.AUDIO;
    } else {
        mediaType = MEDIA_TYPE.VIDEO;
    }

    var nameStr = $("#name").val();
    var tagsStr = $("#tags").val();
    var descStr = $("#description").val();
    var controlId = $("#controlId").val();

    nameStr = nameStr.trim();
    tagsStr = tagsStr.trim();
    if (descStr !== null) {
        descStr = descStr.trim();
    }

    // Creates form data.
    var fd = new FormData();
    fd.append("action", "addFromUploadedFile");
    fd.append("ks", ks);
    fd.append("uploadTokenId", uploadTokenId);
    fd.append("mediaEntry:name", nameStr);
    fd.append("mediaEntry:tags", tagsStr);
    if (descStr !== null && descStr !== "") {
        fd.append("mediaEntry:description", descStr);
    } else {
        fd.append("mediaEntry:description", "");
    }
    fd.append("mediaEntry:mediaType", mediaType);
    fd.append("mediaEntry:categories", $("#categories").val());
    if (controlId !== null && controlId !== "") {
        fd.append("mediaEntry:accessControlId", controlId);
    }
    // Creates transmission data.
    var postData = {
        type: "POST",
        data: fd,
        cache: false,
        async: true,
        contentType: false,
        scriptCharset: "utf-8",
        processData: false,
        dataType: "xml"
    };

    var serviceURL = serverHost + "/api_v3/service/media/action/addFromUploadedFile";

    // Transmits data.
    $.ajax(
        serviceURL, postData
    )
    .done(function(xmlData) {
        // Response is not XML.
        if (xmlData === null || typeof xmlData === undefined) {
            deleteUploadToken(serverHost, ks, uploadTokenId);
            printErrorMessage("Cannot upload the attribute information !<br>(Cannot get a XML response.)");
            return;
        }

        // Get a tag of error code.
        findData = $(xmlData).find("code");
        // There exists error code.
        if (findData !== null && typeof findData !== undefined && findData.text() !== "") {
            deleteUploadToken(serverHost, ks, uploadTokenId);
            printErrorMessage("Cannot upload the attribute information !<br>(" + findData.text() + ")");
            return;
        }

        // Get a tag of status.
        findData = $(xmlData).find("status");
        // There not exists a tag of status.
        if (findData === null || typeof findData === undefined || findData.text() === "") {
            deleteUploadToken(serverHost, ks, uploadTokenId);
            printErrorMessage("Cannot upload the attribute information !<br>(Cannot get a mediaEntryStatus.)");
            return;
        }

        // Get a value of status.
        entryStatus = findData.text();
        // When uploading of metadata failed.
        if (entryStatus != STATUS.ENTRY_READY && entryStatus != STATUS.ENTRY_PENDING &&
            entryStatus != STATUS.ENTRY_PRECONVERT) {
            deleteUploadToken(serverHost, ks, uploadTokenId);
            printErrorMessage("Cannot upload the attribute information !<br>(mediaEntryStatus: " + entryStatus + ")");
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

        // Prints back button.
        addBackButton();
        // Prints success message.
        printSuccessMessage(entryId, entryName, entryTags, entryDescription, entryCreatorId);
    })
    .fail(function(xmlData) {
        deleteUploadToken(serverHost, ks, uploadTokenId);
        if (xmlData !== null) {
            window.console.dir(xmlData);
        }
        printErrorMessage("Cannot upload the attribute information !<br>(Cannot connect to contents server.)");
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

