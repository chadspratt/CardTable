<?php
function GetDatabaseConnection () {
    $user = "username";
    $password = 'password';
    $db = "database_name";
    $mysqli = new mysqli("localhost", $user, $password, $db);
    if ($mysqli->connect_errno) {
        printf("Connect failed: %s\n", $mysqli->connect_error());
    }
    else {
        return $mysqli;
    }
}
?>