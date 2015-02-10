<?php
// make a singleton to store the connection and stuff
require_once "../../db_connect/cards.inc";

$connection = GetDatabaseConnection();
$getStateQuery = $connection->prepare("SELECT * FROM CurrentState
                                      WHERE room = ?");
$addQuery = $connection->prepare("INSERT INTO CurrentState
                                 (room, player, zone, objectType, objectId,
                                 objectImageUrl, objectXPos, objectYPos)
                                 SELECT ?, ?, ?, ?, ?, ?, ?, ?;");
$updateQuery = $connection->prepare("UPDATE CurrentState SET
                                    player = ?, zone = ?, objectId = ?,
                                    objectImageUrl = ?, objectXPos = ?, objectYPos = ?
                                    WHERE room = ? AND player = ? AND
                                    objectType = ? AND objectId = ?;");
$removeQuery = $connection->prepare("DELETE FROM CurrentState
                                    WHERE room = ? AND player = ? AND
                                    objectType = ? AND objectId = ?;");
$markAsUpdatedQuery = $connection->prepare("INSERT INTO LastRoomUpdate
                                    (room) SELECT ?;");
$checkForUpdateQuery = $connection->prepare("SELECT id FROM LastRoomUpdate
                                    WHERE room = ? AND id > ?");

if ($_POST["action"] === "get_state")
{
    session_start();
    if (!array_key_exists("LastRoomUpdateId", $_SESSION))
    {
        $_SESSION["LastRoomUpdateId"] = -1;
    }
    $getStateQuery->bind_param("si",
                               $_POST["room"],
                               $_POST[$_SESSION["LastRoomUpdateId"]]);
    // XXX check for a result
    $getStateQuery->execute();
    $result = $getStateQuery->get_result();
    echo json_encode($result->fetch_all());
}
else
{
    for ($i=0; $i < count($_POST["action"]); $i++)
    {
        if ($_POST["action"][$i] === "add")
        {
            $addQuery->bind_param("ssssisii",
                                  $_POST["room"][$i],
                                  $_POST["player"][$i],
                                  $_POST["zone"][$i],
                                  $_POST["objectType"][$i],
                                  $_POST["objectId"][$i],
                                  $_POST["objectImageUrl"][$i],
                                  $_POST["objectXPos"][$i],
                                  $_POST["objectYPos"][$i]);
            $addQuery->execute();
        }
        elseif ($_POST["action"][$i] === "update")
        {
            $updateQuery->bind_param("ssiisssi",
                                     $_POST["zone"][$i],
                                     $_POST["objectImageUrl"][$i],
                                     $_POST["objectXPos"][$i],
                                     $_POST["objectYPos"][$i],
                                     $_POST["room"][$i],
                                     $_POST["player"][$i],
                                     $_POST["objectType"][$i],
                                     $_POST["objectId"][$i]);
            $updateQuery->execute();
        }
        elseif ($_POST["action"][$i] === "remove")
        {
            $removeQuery->bind_param("sssi",
                                     $_POST["room"][$i],
                                     $_POST["player"][$i],
                                     $_POST["objectType"][$i],
                                     $_POST["objectId"][$i]);
            $removeQuery->execute();
        }
    }
}
?>
