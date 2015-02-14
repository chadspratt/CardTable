<?php
// make a singleton to store the connection and stuff
require_once "../../db_connect/cards.inc";

$connection = GetDatabaseConnection();
$getStateQuery = $connection->prepare("SELECT player, zone, type, id,
                                      imageUrl, xPos, yPos FROM CurrentState
                                      WHERE room = ?");
$addQuery = $connection->prepare("INSERT INTO CurrentState
                                 (room, player, zone, type, id,
                                 imageUrl, xPos, yPos)
                                 SELECT ?, ?, ?, ?, ?, ?, ?, ?");
$updateQuery = $connection->prepare("UPDATE CurrentState SET
                                    zone = ?, xPos = ?, yPos = ?
                                    WHERE room = ? AND player = ? AND
                                    type = ? AND id = ?");
$removeQuery = $connection->prepare("DELETE FROM CurrentState
                                    WHERE room = ? AND player = ? AND
                                    type = ? AND id = ?");
$removePlayerQuery = $connection->prepare("DELETE FROM CurrentState
                                          WHERE room = ? AND player = ?");
$markAsUpdatedQuery = $connection->prepare("INSERT INTO LastRoomUpdate
                                           (room) SELECT ?");
$checkForUpdateQuery = $connection->prepare("SELECT id FROM LastRoomUpdate
                                            WHERE room = ? AND id > ?
                                            ORDER BY id DESC");

// for debugging
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $_POST = $_GET;
}
// var_dump($_POST);

if ($_POST["action"] === "get_state")
{
    $checkForUpdateQuery->bind_param("si",
                                     $_POST["room"],
                                     $_POST["last_update_id"]);
    // wait for new data
    $totalTimeSlept = 0;
    while (true)
    {
        $checkForUpdateQuery->execute();
        $checkForUpdateQuery->bind_result($changeId);
        if ($checkForUpdateQuery->fetch())
        {
            $checkForUpdateQuery->close();
            break;
        }
        $totalTimeSlept += 0.2;
        // max wait time
        if ($totalTimeSlept > 5)
        {
            echo '{"no_changes":"true"}';
            return;
        }
        usleep(200000);
    }

    $getStateQuery->bind_param("s", $_POST["room"]);
    $getStateQuery->execute();
    $getStateQuery->bind_result($player, $zone, $type, $id,
                                $imageUrl, $xPos, $yPos);
    $results = [];
    while ($getStateQuery->fetch())
    {
        $row = [
            "player" => $player,
            "zone" => $zone,
            "type" => $type,
            "id" => $id,
            "imageUrl" => $imageUrl,
            "xPos" => $xPos,
            "yPos" => $yPos
        ];
        array_push($results, $row);
    }
    echo json_encode(array("change_id" => $changeId,
                           "results" => $results));
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
        $addQuery->close();
    }
    elseif ($_POST["action"] === "update")
    {
        $updateQuery->bind_param("siisssi",
                                 $_POST["zone"],
                                 $_POST["x_pos"],
                                 $_POST["y_pos"],
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $updateQuery->execute();
        $updateQuery->close();
    }
    elseif ($_POST["action"] === "remove")
    {
        $removeQuery->bind_param("sssi",
                                 $_POST["room"],
                                 $_POST["player"],
                                 $_POST["type"],
                                 $_POST["id"]);
        $removeQuery->execute();
        $removeQuery->close();
    }
    elseif ($_POST["action"] === "remove_all")
    {
        $removePlayerQuery->bind_param("ss",
                                       $_POST["room"],
                                       $_POST["player"]);
        $removePlayerQuery->execute();
        $removePlayerQuery->close();
    }

    $markAsUpdatedQuery->bind_param("s", $_POST["room"]);
    $markAsUpdatedQuery->execute();
    $lastUpdateId = $connection->insert_id;
    echo '{"last_update_id":"$lastUpdateId"}';
}

$connection->close();
?>
