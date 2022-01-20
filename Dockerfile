FROM node:12
LABEL Mohammed Zia <zia@heigit.org>

WORKDIR /server

COPY package.json /server

# Reproject install for CRS transformation
RUN apt-get update && \
    apt-get install -y gdal-bin tree nano 

# Install the PIP Python package manager
RUN apt-get -y install python-pip && apt-get clean all

# Install AWS Command Line Interface
RUN pip install awscli

# RUN git clone https://github.com/mapbox/tippecanoe.git
RUN git clone https://github.com/mapbox/tippecanoe.git && cd tippecanoe && make && make install && cd ..
# In case, squite lib is not installed - apt-get install sqlite3 && apt-get install libsqlite3-dev && apt-get install libz-dev

RUN npm install 
COPY . /server

CMD node server.js
EXPOSE 8080

