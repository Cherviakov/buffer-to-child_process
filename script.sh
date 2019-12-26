#! /bin/bash

ffmpeg -loglevel 16 -f webm -i pipe: -frames:v 1 -f image2pipe -vcodec png - | pngquant -s 1 -Q 20 - 
