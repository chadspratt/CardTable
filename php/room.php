<?php
class Room
{
    public static function GetRoomId($roomName, $createIfNonexistant=false)
    {
        $roomId = null;

        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getRoomIdQuery = $connection->prepare(
            "SELECT id
             FROM room
             WHERE name = ?");
        $getRoomIdQuery->bind_param("s", $roomName);
        $getRoomIdQuery->execute();
        $getRoomIdQuery->bind_result($roomId);
        $getRoomIdQuery->fetch();
        $getRoomIdQuery->close();
        if ($roomId == null &&
            $createIfNonexistant)
        {
            $addRoomQuery = $connection->prepare(
                "INSERT INTO room (name) SELECT ?");
            $addRoomQuery->bind_param("s", $roomName);
            $addRoomQuery->execute();
            $addRoomQuery->close();
            $roomId = $connection->insert_id;
        }
        $connection->close();
        return $roomId;
    }

    public static function GetFullStateFromRoomName($roomName)
    {
        $roomId = Room::GetRoomId($roomName, true);
        return Room::GetFullStateFromRoomId($roomId);
    }

    public static function GetFullStateFromRoomId($roomId)
    {
        require_once "player.php";
        require_once "deck.php";

        $players = Player::GetPlayersFromRoomId($roomId);
        $decks = Deck::GetDecksFromRoomId($roomId);
        return array("players" => $players,
                     "decks" => $decks);
    }

    public static function UpdateTableRadius($roomId, $tableRadius)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $updateTableImageDistanceQuery = $connection->prepare(
            "UPDATE room SET
             tableRadius = ?
             WHERE id = ?");
        $updateTableImageDistanceQuery->bind_param("si",
                                                   $tableRadius,
                                                   $roomId);
        $updateTableImageDistanceQuery->execute();
        $updateTableImageDistanceQuery->close();
        $connection->close();
    }
}
?>
