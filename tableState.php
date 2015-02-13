<?php
// make a singleton to store the connection and stuff
require_once "../../db_connect/cards.inc";

$connection = GetDatabaseConnection();
$getStateQuery = $connection->prepare("SELECT * FROM CurrentState
                                      WHERE room = ?");
$addQuery = $connection->prepare("INSERT INTO CurrentState
                                 (room, player, zone, type, id,
                                 imageUrl, xPos, yPos)
                                 SELECT ?, ?, ?, ?, ?, ?, ?, ?");
$updateQuery = $connection->prepare("UPDATE CurrentState SET
                                    player = ?, zone = ?, id = ?,
                                    imageUrl = ?, xPos = ?, yPos = ?
                                    WHERE room = ? AND player = ? AND
                                    type = ? AND id = ?");
$removeQuery = $connection->prepare("DELETE FROM CurrentState
                                    WHERE room = ? AND player = ? AND
                                    type = ? AND id = ?");
$removeAllQuery = $connection->prepare("DELETE FROM CurrentState
                                       WHERE room = ? AND player = ?");
$markAsUpdatedQuery = $connection->prepare("INSERT INTO LastRoomUpdate
                                           (room) SELECT ?");
$checkForUpdateQuery = $connection->prepare("SELECT id FROM LastRoomUpdate
                                            WHERE room = ? AND id > ?");
// for debugging
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $_POST = $_GET;
}
var_dump($_POST);

if ($_POST["action"] === "get_state")
{
    session_start();
    if (!array_key_exists("lastRoomUpdateId", $_SESSION))
    {
        $_SESSION["lastRoomUpdateId"] = -1;
    }
    $checkForUpdateQuery->bind_param("si",
                                     $_POST["room"],
                                     $_POST[$_SESSION["lastRoomUpdateId"]]);
    while (true)
    {
        $checkForUpdateQuery->execute();
        $result = $checkForUpdateQuery->get_result()->fetch_all();
        if (count($result) > 0)
        {
            $_SESSION["lastRoomUpdateId"] = $result[0]->id;
            break;
        }
        sleep(0.2);
    }

    $getStateQuery->bind_param("s", $_POST["room"]);
    $getStateQuery->execute();
    $result = $getStateQuery->get_result()->fetch_all();
    echo json_encode($result);
}
else
{
    if ($_POST["action"] === "add")
    {
        for ($i=0; $i < count($_POST["id"]); $i++)
        {
            $addQuery->bind_param("ssssisii",
                                  $_POST["room"],
                                  $_POST["player"],
                                  $_POST["zone"],
                                  $_POST["type"],
                                  $_POST["id"][$i],
                                  $_POST["image_url"][$i],
                                  $_POST["x_pos"][$i],
                                  $_POST["y_pos"][$i]);
            $addQuery->execute();
        }
    }
    elseif ($_POST["action"] === "update")
    {
        $updateQuery->bind_param("ssiisssi",
                                 $_POST["zone"],
                                 $_POST["image_url"],
                                 $_POST["x_pos"],
                                 $_POST["y_pos"],
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $updateQuery->execute();
    }
    elseif ($_POST["action"] === "remove")
    {
        $removeQuery->bind_param("sssi",
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $removeQuery->execute();
    }
    elseif ($_POST["action"] === "remove_all")
    {
        $removeAllQuery->bind_param("s",
                                    $_POST["room"],
                                    $_POST["player"]);
        $removeAllQuery->execute();
    }
    $markAsUpdatedQuery->bind_param("s", $_POST["room"]);
    $_SESSION["lastRoomUpdateId"] = $connection->insert_id;
}
?>
