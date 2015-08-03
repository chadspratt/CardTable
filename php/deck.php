<?php
class Deck
{
    public static function GetDeckId($roomId, $playerId, $deckName)
    {
        $deckId = null;

        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $getDeckIdQuery = $connection->prepare(
            "SELECT id
             FROM deck
             WHERE roomId = ? AND playerId = ? AND name = ?");
        $getDeckIdQuery->bind_param("iis", $ownerId, $playerId, $deckName);
        $getDeckIdQuery->execute();
        $getDeckIdQuery->bind_result($deckId);
        $getDeckIdQuery->fetch();
        $getDeckIdQuery->close();

        // create the deck if it doesn't exist
        if ($deckId == null)
        {
            $addDeckQuery = $connection->prepare(
                "INSERT INTO deck (roomId, playerId, name)
                 SELECT ?, ?, ?");
            $addDeckQuery->bind_param("iis", $roomId,
                                              $playerId,
                                              $deckName);
            $addDeckQuery->execute();
            $addDeckQuery->close();
            $deckId = $connection->insert_id;
        }

        $connection->close();
        return $deckId;
    }

    public static function GetDecksFromRoomId($roomId)
    {
        require_once "../../db_connect/cards.inc";
        require_once "card.php";

        $connection = GetDatabaseConnection();
        $getDecksQuery = $connection->prepare(
            "SELECT id, playerId, name
             FROM deck
             WHERE roomId = ?
             ORDER BY ordering");
        $getDecksQuery->bind_param("i", $roomId);
        $getDecksQuery->execute();
        $getDecksQuery->bind_result($id, $playerId, $name);
        $decks = [];
        while ($getDecksQuery->fetch())
        {
            $row = [
                "id" => $id,
                "playerId" => $playerId,
                "name" => $name
            ];
            $row["cards"] = Card::GetCardsFromDeckId($id);
            array_push($decks, $row);
        }
        $getDecksQuery->close();
        $connection->close();
        return $decks;
    }

    public static function AddDeck($roomId, $deckName, $ownerId,
                                   $cardNames, $cardImageUrls)
    {
        $deckId = Deck::GetDeckId($roomId, $playerId, $deckName);

        require_once "card.php";
        Card::RemoveAllCardsFromDeck($deckId);
        Card::AddCards($deckId, $cardNames, $cardImageUrls);
    }

    public static function AddDefaultDeck($roomId, $deckName, $ownerId)
    {
        $deckId = Deck::GetDeckId($roomId, $playerId, $deckName);

        $cardNames = [];
        $cardImageUrls = [];

        if (($deckManifest = fopen("decks/" . $deckName . "/manifest.csv", "r")) !== FALSE)
        {
            $headers = fgetcsv($deckManifest);
            $nameIndex = 0;
            $imageUrlIndex = 0;
            $countIndex = 0;
            while ($headers[$nameIndex] !== "name") {
                $nameIndex += 1;
                if ($nameIndex > count($headers)) {
                    var_dump($headers);
                }
            }
            while ($headers[$imageUrlIndex] !== "image_url") {
                $imageUrlIndex += 1;
                if ($imageUrlIndex > count($headers)) {
                    var_dump($headers);
                }
            }
            while ($headers[$countIndex] !== "count") {
                $countIndex += 1;
                if ($countIndex > count($headers)) {
                    var_dump($headers);
                }
            }

            while (($cardInfo = fgetcsv($deckManifest)) !== FALSE) {
                for ($i=0; $i < $cardInfo[$countIndex]; $i++) {
                    array_push($cardNames, $cardInfo[$nameIndex]);
                    array_push($cardImageUrls, $cardInfo[$imageUrlIndex]);
                }
            }
        }

        require_once "card.php";
        Card::RemoveAllCardsFromDeck($deckId);
        Card::AddCards($deckId, $cardNames, $cardImageUrls);
    }

    public static function Shuffle($deckId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        require_once "card.php";
        $cards = Card::GetCardsFromDeckId($deckId);

        shuffle($cards);

        $updateCardOrderingQuery = $connection->prepare(
            "UPDATE card
             SET ordering = ?
             WHERE id = ?");
        $updateCardOrderingQuery->bind_param("ii", $ordering, $cardId);
        for ($i=0; $i < count($cards); $i++) {
            $ordering = $i;
            $cardId = $cards[$i]["id"];
            $updateCardOrderingQuery->execute();
        }
        $updateCardOrderingQuery->close();

        $connection->close();
    }

    // not updating ordering here, which could be an issue
    public static function ReturnAllCards($deckId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $returnCardsToDeckQuery = $connection->prepare(
            "UPDATE card
             SET zone = 'deck'
             WHERE deckId = ?");
        $returnCardsToDeckQuery->bind_param("i", $deckId);
        $returnCardsToDeckQuery->execute();
        $returnCardsToDeckQuery->close();

        $connection->close();
    }

    public static function Remove($deckId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $removeDeckCardsQuery = $connection->prepare(
            "DELETE FROM card
             WHERE deckId = ?");
        $removeDeckCardsQuery->bind_param("i", $deckId);
        $removeDeckCardsQuery->execute();
        $removeDeckCardsQuery->close();

        $removeDeckQuery = $connection->prepare(
            "DELETE FROM deck
             WHERE id = ?");
        $removeDeckQuery->bind_param("i", $deckId);
        $removeDeckQuery->execute();
        $removeDeckQuery->close();

        $connection->close();
    }

    public static function UpdateOwner($deckId, $ownerId)
    {
        require_once "../../db_connect/cards.inc";
        $connection = GetDatabaseConnection();

        $updateDeckOwnerQuery = $connection->prepare(
            "UPDATE deck
             SET playerId = ?
             WHERE id = ?");
        $updateDeckOwnerQuery->bind_param("ii", $ownerId, $deckId);
        $updateDeckOwnerQuery->execute();
        $updateDeckOwnerQuery->close();

        $connection->close();
    }
}
?>
