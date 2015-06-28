Feature: Google search

Scenario: Searching Google For The First Time
	
	given That I open Google's search page
    when I search for for money
    then About 2,640,000,000 results gets displayed
