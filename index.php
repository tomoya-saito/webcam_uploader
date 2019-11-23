<?php
/**
 * Webcam recording and uploading script.
 * @copyright  2017-2019 Tomoya Saito
 * @license    http://www.gnu.org/licenses/agpl.html GNU AGPL v3 or later
 */

require_once("API/KalturaClient.php"); 

// Your Kaltura account Id (aka partnerId), taken from KMC>Settings>Integration Settings.
define("KALTURA_PARTNER_ID", 000);

// Make sure to replace "myUploaderUser@domain.com" with your system user id.
// When allowing anonymous uploads, make sure to create a new user in the Kaltura system that has only upload permissions, then set partnerUserID to the that user.
define("KALTURA_PARTNER_USER_ID", 'myUploaderUser@domain.com');

// Taken from KMC>Settings>Integration Settings.
define("KALTURA_PARTNER_WEB_SERVICE_SECRET", "");

// Kaltura service URL (can be changed to work with on-prem deployments).
define("KALTURA_SERVICE_URL", 'http://www.kaltura.com/');

// Session length (seconds)
define("SESSION_LENGTH", 86400);

// Access control profile id applied to new media entry.
// Taken from KMC>Settings>Access Control.
define("ACCESS_CONTROL_PROFILE_ID", 2);

// Category path applied to new media entry.
define("CATEGORY_PATH", "video");

// Web browser moves to this URL when "Back" button and "Reset" button are clicked.
define("BACK_URL", "./index.php");

header('Access-Control-Allow-Origin: *');

$output ="";

$output .= "<!DOCTYPE html>";
$output .= "<html lang=\"ja\">";
$output .= "<head>";
$output .= "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">";
$output .= "<meta http-equiv=\"Content-Style-Type\" content=\"text/css\">";
$output .= "<link href=\"./css/webcam_uploader.css\" rel=\"stylesheet\" type=\"text/css\">";
$output .= "<title>Webcam Uploader</title>";
$output .= "</head>";

$output .= "<body bgcolor=\"white\" text=\"black\" link=\"blue\" alink=\"red\" vlink=\"purple\">";

$index = strrpos($_SERVER["REQUEST_URI"], "/");
$path = substr($_SERVER["REQUEST_URI"], 0, $index);

$kalturahost = KALTURA_SERVICE_URL;

while (substr($kalturahost, -1) == "/") {
    $kalturahost = substr($kalturahost, 0, strlen($kalturahost) - 1);
}

$recurl =  $path . "/images/rec.png";
$stopurl = $path . "/images/stop.png";
$deleteurl = $path . "/images/delete.png";

$output .= "<input type=\"hidden\" name=\"recurl\" id=\"recurl\" value=\"" . $recurl . "\">";
$output .= "<input type=\"hidden\" name=\"stopurl\" id=\"stopurl\" value=\"" . $stopurl . "\">";
$output .= "<input type=\"hidden\" name=\"deleteurl\" id=\"deleteurl\" value=\"" . $deleteurl . "\">";
$output .= "<input type=\"hidden\" name=\"backUrl\" id=\"backUrl\" value=\"" . BACK_URL . "\">";

try {
    // Construction of Kaltura object.
    $config = new KalturaConfiguration(KALTURA_PARTNER_ID);
    $config->serviceUrl = KALTURA_SERVICE_URL;
    // Construction of Kaltura Client object.
    $client = new KalturaClient($config);

    if (empty($client)) {
        $output .= "<div><font color=\"red\">Cannot create KalturaClient object.</font></div>";
    } else {
        // Start kaltura session.
        $ks = $client->session->start(KALTURA_PARTNER_WEB_SERVICE_SECRET,
                                      KALTURA_PARTNER_USER_ID,
                                      KalturaSessionType::USER,
                                      KALTURA_PARTNER_ID,
                                      SESSION_LENGTH);

        if (!$ks) {
            $output .= "<div><font color=\"red\">Cannot start a session.</font></div>";
        }
        else {  // When connection started.

            $output .= "<script type=\"text/javascript\" src=\"js/jquery-3.2.1.min.js\"></script>";
            $output .= "<script type=\"text/javascript\" src=\"js/webcam_uploader.js\"></script>";

            $output .= "<div id=\"upload_info\" name=\"upload_info\">";
            $output .= "<h2>Webcam Uploader</h2>";
            
            $output .= "<div id=\"uploader_content\">";
            
            $output .= "<form method=\"post\" name=\"entry_form\" enctype=\"multipart/form-data\" autocomplete=\"off\">";

            $output .= "<div id=\"video_exp\">1. Please recording a movie.</div>";
            $output .= "<br>";
            $output .= "<div id=\"message\"></div>";
            $output .= "<table  border=\"0\">";
            $output .= "<tr>";
            $output .= "<td colspan=\"2\">";
            $output .= "<table border=\"2\">";
            $output .= "<tr>";
            $output .= "<td>";
            $output .= "<div id=\"videospan\" name=\"videospan\">";
            $output .= "</div>";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "</table>";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "<tr>";
            $output .= "<td colspan=\"2\" align=\"center\">";
            $output .= "<div id=\"status\" name=\"status\">";
            $output .= "</div>";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "<tr>";
            $output .= "<td align=\"left\">";
            $output .= "<div id=\"leftspan\" name=\"leftspan\">";
            $output .= "<img src=\"" . $recurl . "\" width=\"64\" height=\"64\" alt=\"REC/STOP\" name=\"recstop\" id=\"recstop\" border=\"0\">";
            $output .= "</div>";
            $output .= "</td>";
            $output .= "<td align=\"right\">";
            $output .= "<div id=\"rightspan\" name=\"rightspan\">";
            $output .= "<img src=\"" . $deleteurl . "\" width=\"64\" height=\"64\" alt=\"remove\" name=\"remove\" id=\"remove\" border=\"0\">";
            $output .="</div>";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "</table>";
            $output .= "<br><br>";

            $output .= "<div id=\"metadata_exp\">2. Please input metadata (attribute information), and submit the file.";
            $output .= "<br>";
            $output .= "(<span id=\"entry_warning\">* : Required field</span>)";
            $output .= "</div>";
            $output .= "<br>";
            $output .= "<fieldset>";
            $output .= "<table border=\"0\">";

            $output .= "<tr>";
            $output .= "<td>";
            $output .= "Name";
            $output .= "<span id=\"entry_warning\">*</span>&nbsp;:";
            $output .= "</td>";
            $output .= "<td>";
            $output .= "<input type=\"text\" name=\"name\" id=\"name\" size=\"30\" required=\"true\">";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "<tr>";
            $output .= "<td id=\"metadata_fields\" valign=\"top\">";
            $output .= "Tags";
            $output .= "<span id=\"entry_warning\">*</span>&nbsp;:";
            $output .= "</td>";
            $output .= "<td>";
            $output .= "<input type=\"text\" name=\"tags\" id=\"tags\" size=\"30\" required=\"true\">";
            $output .= " &nbsp; (Comma-separated)";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "<tr>";
            $output .= "<td id=\"metadata_fields\">Description :";
            $output .= "</td>";
            $output .= "<td>";
            $output .= "<textarea name=\"description\" id=\"description\" cols=\"30\" rows=\"5\" maxlength=\"150\">";
            $output .= "</textarea>";
            $output .= "</td>";
            $output .= "</tr>";
            $output .= "</table>";
            $output .= "<br>";

            $output .= "<input type=\"hidden\" id=\"kalturahost\" name=\"kalturahost\" value=\"" . $kalturahost . "\">";
            $output .= "<input type=\"hidden\" id=\"ks\" name=\"ks\" value=\"" . $ks . "\">";
            $output .= "<input type=\"hidden\" id=\"filename\" name=\"filename\" value=\"" . sha1($ks, false) . "\">";
            $output .= "<input type=\"hidden\" id=\"categories\" name=\"categories\" value=\"" . CATEGORY_PATH . "\">";
            $output .= "<input type=\"hidden\" id=\"controlId\" name=\"controlId\" value=\"" . ACCESS_CONTROL_PROFILE_ID . "\">";
            $output .= "<input type=\"hidden\" id=\"type\" name=\"type\" value=\"\">";

            $output .= "<input type=\"button\" name=\"entry_submit\" id=\"entry_submit\" value=\"Upload\">";
            $output .= "&nbsp;&nbsp;";
            $output .= "<input type=\"reset\" name=\"reset\" id=\"entry_reset\" value=\"Reset\">";
            $output .= "</fieldset>";
            $output .= "</form>";
            $output .= "<hr>";
            $output .= "<br>";

            $output .= "<input type=\"button\" name=\"uploader_cancel\" id=\"uploader_cancel\" value=\"Cancel\">";

            $output .= "</div>";

            $output .= "</div>";

            $output .= "<div id=\"modal_content\">";
            $output .= "<h3 align=\"center\">Uploading</h3>";
            $output .= "</div>";
        }
    }
} catch(Exception $ex) {
    $output .= "<div><font color=\"red\">";
    $output .= "Exception(s) occurred.<br>";
    $output .= $ex->getMessage();
    $output .= "</font>";
}

$output .= "</body>";
$output .= "</html>";

echo $output;
