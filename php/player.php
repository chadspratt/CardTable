<?php
class Player
{
    public static function GetPlayersFromRoomId($roomId)
    {
        require_once "../../db_connect/cards.inc";
        require_once "card.php";
        require_once "marker.php";

        $connection = GetDatabaseConnection();
        $getPlayersQuery = $connection->prepare(
            "SELECT id, name, score, backgroundImageUrl, backgroundImageScale,
                    deckDealXPos, deckDealYPos, ordering
             FROM player
             WHERE roomId = ?
             ORDER BY ordering");
        $getPlayersQuery->bind_param("i", $roomId);
        $getPlayersQuery->execute();
        $getPlayersQuery->bind_result($id, $name, $score,
                                      $backgroundImageUrl, $backgroundImageScale,
                                      $deckDealXPos, $deckDealYPos, $ordering);
        $players = [];
        while ($getPlayersQuery->fetch())
        {
            $row = [
                "id" => $id,
                "name" => $name,
                "score" => $score,
                "backgroundImageUrl" => $backgroundImageUrl,
                "backgroundImageScale" => $backgroundImageScale,
                "deckDealXPos" => $deckDealXPos,
                "deckDealYPos" => $deckDealYPos,
                "ordering" => $ordering
            ];
            $row["zones"] = Card::GetCardsFromPlayerId($id);
            $row["markers"] = Marker::GetMarkersFromPlayerId($id);
            array_push($players, $row);
        }
        $getPlayersQuery->close();
        $connection->close();
        return $players;
    }

    public static function AddPlayer($roomId, $playerName)
    {
        require_once "../../db_connect/cards.inc";
        require_once "card.php";

        $connection = GetDatabaseConnection();

        $checkForPlayerQuery = $connection->prepare(
            "SELECT COUNT(id)
             FROM player
             WHERE roomId = ? AND name = ?");
        $checkForPlayerQuery->bind_param("ss",
                                         $roomId,
                                         $playerName);

        $checkForPlayerQuery->execute();
        $checkForPlayerQuery->bind_result($existingCount);
        $checkForPlayerQuery->fetch();
        $checkForPlayerQuery->close();
        if ($existingCount == 0)
        {
            $ordering = -1;
            $getMaxPlayerOrderingQuery = $connection->prepare(
                "SELECT MAX(ordering)
                FROM player
                WHERE roomId = ?");
            $getMaxPlayerOrderingQuery->bind_param("i", $roomId);
            $getMaxPlayerOrderingQuery->execute();
            $getMaxPlayerOrderingQuery->bind_result($ordering);
            $getMaxPlayerOrderingQuery->fetch();
            $ordering += 1;
            $getMaxPlayerOrderingQuery->close();

            $addPlayerQuery = $connection->prepare(
                "INSERT INTO player
                 (roomId, name, ordering)
                 SELECT ?, ?, ?");
            $addPlayerQuery->bind_param("isi",
                                        $roomId,
                                        $playerName,
                                        $ordering);
            $addPlayerQuery->execute();
            $addPlayerQuery->close();
        $connection->close();
        }
    }

    public static function UpdateTableImage($playerId, $tableImageUrl)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();
        $updateTableImageUrlQuery = $connection->prepare(
            "UPDATE player
             SET backgroundImageUrl = ?
             WHERE id = ?");
        $updateTableImageUrlQuery->bind_param("si",
                                              $tableImageUrl,
                                              $playerId);
        $updateTableImageUrlQuery->execute();
        $updateTableImageUrlQuery->close();
        $connection->close();
    }

    public static function UpdateTableImageScale($playerId, $tableImageScale)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();
        $updateTableImageScaleQuery = $connection->prepare(
            "UPDATE player SET
             backgroundImageScale = ?
             WHERE id = ?");
        $updateTableImageScaleQuery->bind_param("di",
                                                $tableImageScale,
                                                $playerId);
        $updateTableImageScaleQuery->execute();
        $updateTableImageScaleQuery->close();
        $connection->close();
    }

    public static function UpdateDeckDealPoint($playerId, $x, $y)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();
        $updateDeckDealPointQuery = $connection->prepare(
            "UPDATE player SET
             deckDealXPos = ?, deckDealYPos = ?
             WHERE id = ?");
        $updateDeckDealPointQuery->bind_param("iii",
                                              $x,
                                              $y,
                                              $playerId);
        $updateDeckDealPointQuery->execute();
        $updateDeckDealPointQuery->close();
        $connection->close();
    }

    public static function UpdateScore($playerId, $score)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();
        $updateScoreQuery = $connection->prepare(
            "UPDATE player SET
             score = ?
             WHERE id = ?");
        $updateScoreQuery->bind_param("ii",
                                      $score,
                                      $playerId);
        $updateScoreQuery->execute();
        $updateScoreQuery->close();
        $connection->close();
    }

    public static function UpdateName($playerId, $newName)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();
        $updateNameQuery = $connection->prepare(
            "UPDATE player SET
             name = ?
             WHERE id = ?");
        $updateNameQuery->bind_param("si",
                                     $newName,
                                     $playerId);
        $updateNameQuery->execute();
        $updateNameQuery->close();
        $connection->close();
    }

    public static function Remove($playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $deletePlayerCardsQuery = $connection->prepare(
            "DELETE FROM card
             WHERE deckId IN (
                SELECT id
                FROM deck
                WHERE playerId = ?)");
        $deletePlayerCardsQuery->bind_param("i",
                                     $playerId);
        $deletePlayerCardsQuery->execute();
        $deletePlayerCardsQuery->close();

        $deleteMarkersQuery = $connection->prepare(
            "DELETE FROM marker
             WHERE playerId = ?");
        $deleteMarkersQuery->bind_param("i",
                                     $playerId);
        $deleteMarkersQuery->execute();
        $deleteMarkersQuery->close();

        $deletePlayerDecksQuery = $connection->prepare(
            "DELETE FROM deck
             WHERE playerId = ?");
        $deletePlayerDecksQuery->bind_param("i",
                                     $playerId);
        $deletePlayerDecksQuery->execute();
        $deletePlayerDecksQuery->close();

        $deletePlayerQuery = $connection->prepare(
            "DELETE FROM player
             WHERE id = ?");
        $deletePlayerQuery->bind_param("i",
                                     $playerId);
        $deletePlayerQuery->execute();
        $deletePlayerQuery->close();
        $connection->close();
    }

    // not updating ordering here, which could be an issue
    public static function Reset($playerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $resetPlayerCardsQuery = $connection->prepare(
            "UPDATE card
             SET zone = 'deck'
             WHERE playerId = ?");
        $resetPlayerCardsQuery->bind_param("i",
                                     $playerId);
        $resetPlayerCardsQuery->execute();
        $resetPlayerCardsQuery->close();

        $deleteMarkersQuery = $connection->prepare(
            "DELETE FROM marker
             WHERE playerId = ?");
        $deleteMarkersQuery->bind_param("i",
                                     $playerId);
        $deleteMarkersQuery->execute();
        $deleteMarkersQuery->close();

        $connection->close();
    }
}
?>
