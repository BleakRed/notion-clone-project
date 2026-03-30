-----
the database structure basic
-----

the question(asuult) <- options(haruilt)
the question -> quiz
the Quiz(Sub Title) -> topic(Main Topic)


---------
Question
---------
Id | Int PK (not null)
text | varchar(500)
difficulty_level | small int (not null auto >= 0)
quiz_id | big int FK (not null) <- Quiz.id
---------

---------
Option
---------
Id | int PK (not null)
text | varchar(255)
is_correct | bool (not null)
question_id | big int FK (not null) <- Question.id
---------

---------
Quiz
---------
id | int PK
title | varchar(200)
description | text
order | int
topic_id | big int FK (not null) <- Topic.id
---------

---------
Topic
---------
id | int PK
title | varchar(200)
description | text
order | int
---------

